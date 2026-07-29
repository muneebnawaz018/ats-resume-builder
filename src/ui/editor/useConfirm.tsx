"use client";

import { useCallback, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type Request = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
};

/**
 * Confirmation for destructive actions.
 *
 * Deleting a section removes several entries at once and leaves no visible
 * trace of what was lost, so an accidental click is expensive even with undo
 * available.
 */
export function useConfirm() {
  const [request, setRequest] = useState<Request | null>(null);
  const confirm = useCallback((r: Request) => setRequest(r), []);

  const dialog = (
    <Dialog
      open={request !== null}
      onClose={() => setRequest(null)}
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>
        {request?.title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 13 }}>
          {request?.body}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setRequest(null)}>Keep it</Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => {
            request?.onConfirm();
            setRequest(null);
          }}
        >
          {request?.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, dialog };
}
