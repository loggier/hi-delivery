import type { NotificationChannel, NotificationTemplate } from '@/types';
import { sendEvolutionTextMessage } from '@/lib/evolution';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderBrandedEmail } from '@/lib/mail/email-layout';
import { sendEmail } from '@/lib/mail/mailer';
import {
  extractNotificationVariables,
  findMissingVariables,
  renderTemplate,
} from './template-renderer';

export type SendNotificationInput = {
  templateId?: string;
  templateKey?: string;
  channel: NotificationChannel;
  recipient: string;
  variables: Record<string, unknown>;
};

/**
 * Base pública para recursos del correo (logo). Prioriza APP_PUBLIC_URL y,
 * si no existe, usa la constante app.site_url. Devuelve null si no hay ninguna.
 */
function resolvePublicBaseUrl(siteUrlConstant: unknown): string | null {
  const fromEnv = process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const fromConstant = String(siteUrlConstant ?? '').trim().replace(/\/+$/, '');
  return fromConstant || null;
}

export async function sendNotification(input: SendNotificationInput) {
  const supabase = createSupabaseAdminClient();
  const templateQuery = supabase
    .from('notification_templates')
    .select('*')
    .eq('channel', input.channel)
    .eq('status', 'ACTIVE')
    .limit(1);

  const query = input.templateId
    ? templateQuery.eq('id', input.templateId)
    : templateQuery.eq('template_key', input.templateKey);

  const { data: template, error: templateError } = await query.single();
  if (templateError || !template) {
    throw new Error('Plantilla activa no encontrada para el canal seleccionado.');
  }

  const activeTemplate = template as NotificationTemplate;
  const { data: constants } = await supabase
    .from('notification_constants')
    .select('key,value');
  const constantVariables = Object.fromEntries(
    (constants ?? []).map((constant) => [constant.key, constant.value]),
  );
  const mergedVariables = {
    ...constantVariables,
    ...input.variables,
  };
  const requiredVariables = extractNotificationVariables(activeTemplate.subject, activeTemplate.body);
  const missingVariables = findMissingVariables(requiredVariables, mergedVariables);
  if (missingVariables.length > 0) {
    throw new Error(`Faltan variables requeridas: ${missingVariables.join(', ')}`);
  }

  const renderedSubject = activeTemplate.subject
    ? renderTemplate(activeTemplate.subject, mergedVariables)
    : null;
  const renderedBody = renderTemplate(activeTemplate.body, mergedVariables);

  // Los correos no se registran: el texto puede contener enlaces o códigos de acceso.
  const logsEnabled = activeTemplate.channel !== 'email';
  let logId: string | null = null;

  if (logsEnabled) {
    const { data: log, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        template_key: activeTemplate.template_key,
        template_id: activeTemplate.id,
        channel: activeTemplate.channel,
        audience: activeTemplate.audience,
        recipient: input.recipient,
        variables: mergedVariables,
        rendered_subject: renderedSubject,
        rendered_body: renderedBody,
        status: 'pending',
        provider: activeTemplate.channel === 'whatsapp' ? 'evolution' : activeTemplate.channel,
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }
    logId = log.id;
  }

  try {
    let providerResponse: unknown = null;

    if (activeTemplate.channel === 'whatsapp') {
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('evolution_instance_name')
        .eq('id', 1)
        .single();

      if (settingsError || !settings?.evolution_instance_name) {
        throw new Error('No hay instancia de Evolution configurada.');
      }

      providerResponse = await sendEvolutionTextMessage(settings.evolution_instance_name, {
        number: input.recipient,
        text: renderedBody,
      });
    } else if (activeTemplate.channel === 'email') {
      if (!renderedSubject) {
        throw new Error('La plantilla de correo necesita un asunto.');
      }

      const publicBaseUrl = resolvePublicBaseUrl(mergedVariables['app.site_url']);
      const html = renderBrandedEmail({
        subject: renderedSubject,
        bodyText: renderedBody,
        appName: String(mergedVariables['app.name'] ?? '').trim(),
        siteUrl: String(mergedVariables['app.site_url'] ?? '').trim() || null,
        logoUrl: publicBaseUrl ? `${publicBaseUrl}/logo-hid.png` : null,
      });

      const emailResult = await sendEmail({
        to: input.recipient,
        subject: renderedSubject,
        text: renderedBody,
        html,
      });

      providerResponse = {
        messageId: emailResult.messageId,
        rejectedCount: emailResult.rejectedCount,
      };
    } else {
      providerResponse = {
        skipped: true,
        reason: `El canal ${activeTemplate.channel} todavía no tiene proveedor de envío.`,
      };
    }

    if (logId) {
      const { error: updateError } = await supabase
        .from('notification_logs')
        .update({
          status: 'sent',
          provider_response: providerResponse as Record<string, unknown>,
        })
        .eq('id', logId);

      if (updateError) throw updateError;
    }

    return {
      template: activeTemplate,
      renderedSubject,
      renderedBody,
      providerResponse,
      logId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar la notificación.';
    if (logId) {
      await supabase
        .from('notification_logs')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', logId);
    }
    throw error;
  }
}
