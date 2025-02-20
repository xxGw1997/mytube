import { PlusIcon } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";

export const StudioUploadModal = () => {
  return (
    <Button variant="secondary">
      <PlusIcon />
      Create
    </Button>
  );
};
