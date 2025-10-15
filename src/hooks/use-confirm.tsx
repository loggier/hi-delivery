"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

type ConfirmationDialogProps = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonProps["variant"];
};

type PromiseResolve = (value: boolean) => void;

export const useConfirm = () => {
  const [dialog, setDialog] = useState<ConfirmationDialogProps | null>(null);
  const [promise, setPromise] = useState<{ resolve: PromiseResolve } | null>(null);

  const confirm = (props: ConfirmationDialogProps) => {
    return new Promise<boolean>((resolve) => {
      setDialog(props);
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    promise?.resolve(false);
    setDialog(null);
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    setDialog(null);
    setPromise(null);
  };

  const ConfirmationDialog = () => (
    <AlertDialog open={!!dialog}>
      {dialog && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>
              {dialog.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              onClick={handleConfirm}
            >
              <Button variant={dialog.confirmVariant || 'destructive'}>{dialog.confirmText || "Confirm"}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );

  return [ConfirmationDialog, confirm] as const;
};
