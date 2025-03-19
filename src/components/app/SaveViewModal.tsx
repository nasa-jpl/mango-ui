import {
  Button,
  IconWarning,
  Input,
  Modal,
  ModalActionRow,
  ModalBody,
  ModalDescription,
} from "@nasa-jpl/react-stellar";
import { useState } from "react";
import { View } from "../../types/view";
import { saveView } from "../../utilities/api";
import "./SaveViewModal.css";

export declare type SaveViewModalProps = {
  onClose: () => void;
  open: boolean;
  view: View;
};

const supersecretpassword = "This will be a secret";

export const SaveViewModal = ({
  view,
  open = false,
  onClose = () => {},
}: SaveViewModalProps) => {
  const [password, setPassword] = useState(supersecretpassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allowSave =
    supersecretpassword.toLowerCase() === password.toLowerCase();

  async function onSave() {
    try {
      setSaving(true);
      await saveView(view);
      setError("");
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
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      className="save-view-modal"
      title="Save View Changes"
      onOpenChange={requestClose}
      modalContentProps={{
        onEscapeKeyDown: (evt) => {
          evt.preventDefault();
        },
        onPointerDownOutside: (evt) => {
          evt.preventDefault();
        },
      }}
    >
      <ModalBody>
        <ModalDescription>
          This action will make your current UI view configuration (charts,
          pages, etc) the default view for all users. Enter the administrative
          password to proceed.
        </ModalDescription>
        <Input
          placeholder="Enter password..."
          onInput={(v) => setPassword(v.target.value)}
          value={password}
        />
        {error && (
          <div className="st-typography-label save-error">
            <IconWarning />
            Error saving view: {error}
          </div>
        )}
      </ModalBody>
      <ModalActionRow>
        <Button onClick={requestClose} variant="secondary">
          Cancel
        </Button>
        <Button disabled={!allowSave || saving} onClick={onSave}>
          Save
        </Button>
      </ModalActionRow>
    </Modal>
  );
};

export default SaveViewModal;
