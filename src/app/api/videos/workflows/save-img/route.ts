import { VideoAssetReadyWebhookEvent } from "@mux/mux-node/resources/webhooks.mjs";
import { serve } from "@upstash/workflow/nextjs";
import { eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { db } from "~/db";
import { videos } from "~/db/schema";

interface InputType {
  data: VideoAssetReadyWebhookEvent["data"];
  tempThumbnailUrl: string;
  tempPreviewUrl: string;
  duration: number;
  playbackId: string;
  upload_id: string;
}

export const { POST } = serve(async (context) => {
  const input = context.requestPayload as InputType;
  const {
    data,
    duration,
    playbackId,
    tempPreviewUrl,
    tempThumbnailUrl,
    upload_id,
  } = input;

  // upload img url to Uploadthing.
  const { previewKey, previewUrl, thumbnailKey, thumbnailUrl } =
    await context.run("upload-img", async () => {
      const utapi = new UTApi();
      const [uploadedThumbnail, uploadedPreview] =
        await utapi.uploadFilesFromUrl([tempThumbnailUrl, tempPreviewUrl]);
      if (!uploadedThumbnail.data || !uploadedPreview.data)
        throw new Error("Failed to upload thumbnail or preview");

      const { key: thumbnailKey, ufsUrl: thumbnailUrl } =
        uploadedThumbnail.data;
      const { key: previewKey, ufsUrl: previewUrl } = uploadedPreview.data;

      return { thumbnailKey, thumbnailUrl, previewKey, previewUrl };
    });

  // save uploadthing img url to database
  await context.run("update-video", async () => {
    await db
      .update(videos)
      .set({
        muxStatus: data.status,
        muxPlaybackId: playbackId,
        muxAssetId: data.id,
        thumbnailUrl,
        thumbnailKey,
        previewUrl,
        previewKey,
        duration,
      })
      .where(eq(videos.muxUploadId, upload_id));
  });
});
