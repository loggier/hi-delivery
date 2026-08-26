'use client';
import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContextPanelContent } from './context-panel';
export function ContextDrawer({ open, onOpenChange, ...props }: React.ComponentProps<typeof ContextPanelContent> & { open: boolean; onOpenChange: (open: boolean) => void }) { return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent><SheetHeader><SheetTitle>Contexto operativo</SheetTitle></SheetHeader><div className="mt-6"><ContextPanelContent {...props} /></div></SheetContent></Sheet>; }
