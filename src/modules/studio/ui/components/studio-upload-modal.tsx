"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";

export const StudioUploadModal = () => {
  const utils = trpc.useUtils();
  const create = trpc.videos.create.useMutation({
    onSuccess: () => {
      toast.success("Video created!", { position: "bottom-right" });
      utils.studio.getMany.invalidate();
    },
    onError: (error) => {
      toast.error(`Something went wrong! Error: ${error.message}`);
    },
  });

  return (
    <Button
      variant="secondary"
      onClick={() => create.mutate()}
      disabled={create.isPending}
    >
      {create.isPending ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <PlusIcon />
      )}
      Create
    </Button>
  );
};
