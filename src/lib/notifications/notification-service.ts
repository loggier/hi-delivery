import type { NotificationChannel, NotificationTemplate } from '@/types';
import { sendEvolutionTextMessage } from '@/lib/evolution';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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
    } else {
      providerResponse = {
        skipped: true,
        reason: `El canal ${activeTemplate.channel} todavía no tiene proveedor de envío.`,
      };
    }

    const { error: updateError } = await supabase
      .from('notification_logs')
      .update({
        status: 'sent',
        provider_response: providerResponse as Record<string, unknown>,
      })
      .eq('id', log.id);

    if (updateError) throw updateError;

    return {
      template: activeTemplate,
      renderedSubject,
      renderedBody,
      providerResponse,
      logId: log.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar la notificación.';
    await supabase
      .from('notification_logs')
      .update({
        status: 'failed',
        error_message: message,
      })
      .eq('id', log.id);
    throw error;
  }
}
