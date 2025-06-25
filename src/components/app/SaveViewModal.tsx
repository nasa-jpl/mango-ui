import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
} from "@nasa-jpl/stellar-react";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { View } from "../../types/view";
import { saveView } from "../../utilities/api";

export declare type SaveViewModalProps = {
  onClose: () => void;
  onSave: (view: View) => void;
  open: boolean;
  view: View;
};

const secret = "This will be a secret";

export const SaveViewModal = ({
  view,
  open = false,
  onClose = () => {},
  onSave = () => {},
}: SaveViewModalProps) => {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allowSave = secret.toLowerCase() === password.toLowerCase();

  async function onSaveClick() {
    try {
      setSaving(true);
      await saveView(view);
      setError("");
      onSave(view);
      requestClose();
    } catch (err) {
      console.log("Error saving view :>> ", err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (!saving) {
      setPassword("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent>
        <DialogTitle>Save View Changes</DialogTitle>
        <DialogDescription>
          This action will make your current UI view configuration (charts,
          pages, etc) the default view for all users. Enter the administrative
          password to proceed.
        </DialogDescription>
        <div className="mb-4">
          <Input
            placeholder="Enter password..."
            onInput={(v) => setPassword((v.target as HTMLInputElement).value)}
            value={password}
            type="password"
          />
          {error && (
            <div className="text-red-500 mt-2 text-sm flex gap-1 items-center">
              <TriangleAlert size={16} />
              Error saving view: {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="xl" onClick={requestClose} variant="secondary">
            Cancel
          </Button>
          <Button
            size="xl"
            disabled={!allowSave || saving}
            onClick={onSaveClick}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveViewModal;
