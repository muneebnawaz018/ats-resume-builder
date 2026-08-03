"use client";

import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { ADDABLE_SECTIONS, type SectionType } from "@/schema";
import { v } from "@/ui/theme/vars";

export function AddSectionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: SectionType, title: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 0.5 }}>
        Add a section
      </DialogTitle>
      <Typography sx={{ px: 3, pb: 1.5, fontSize: 12.5, color: v.text3 }}>
        You can rename any of these afterwards. The type decides which fields
        you get and how the entries are laid out.
      </Typography>
      <DialogContent sx={{ p: 0, pb: 2 }}>
        <List disablePadding>
          {ADDABLE_SECTIONS.map((s) => (
            <ListItemButton
              key={s.type + s.title}
              onClick={() => {
                onAdd(s.type, s.title);
                onClose();
              }}
              sx={{ px: 3, py: 1.25, borderRadius: 0 }}
            >
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  {s.title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: v.text3 }}>
                  {s.hint}
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
