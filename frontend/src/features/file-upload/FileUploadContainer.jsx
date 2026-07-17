import FileUpload from "../../FileUpload";
import { useFileUploadController } from "./hooks/useFileUploadController";

export default function FileUploadContainer() {
  const fileUpload = useFileUploadController();

  return (
    <FileUpload
      viewModel={fileUpload.viewModel}
      actions={fileUpload.actions}
    />
  );
}
