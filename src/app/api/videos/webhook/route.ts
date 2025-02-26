import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { UTApi } from "uploadthing/server";
import {
  VideoAssetCreatedWebhookEvent,
  VideoAssetDeletedWebhookEvent,
  VideoAssetErroredWebhookEvent,
  VideoAssetReadyWebhookEvent,
  VideoAssetTrackReadyWebhookEvent,
} from "@mux/mux-node/resources/webhooks";
import { mux } from "~/lib/mux";
import { db } from "~/db";
import { videos } from "~/db/schema";
import { workflow } from "~/lib/workflow";

const SIGNING_SECRET = process.env.MUX_WEBHOOK_SECRET!;

type WebhookEvent =
  | VideoAssetCreatedWebhookEvent
  | VideoAssetErroredWebhookEvent
  | VideoAssetReadyWebhookEvent
  | VideoAssetTrackReadyWebhookEvent
  | VideoAssetDeletedWebhookEvent;

export const POST = async (request: Request) => {
  if (!SIGNING_SECRET) {
    throw new Error("MUX_WEBHOOK_SECRET is not set.");
  }

  const headersPayload = await headers();
  const muxSignature = headersPayload.get("mux-signature");

  if (!muxSignature) {
    return new Response("No signature found", { status: 401 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  mux.webhooks.verifySignature(
    body,
    { "mux-signature": muxSignature },
    SIGNING_SECRET
  );

  switch (payload.type as WebhookEvent["type"]) {
    case "video.asset.created": {
      const data = payload.data as VideoAssetCreatedWebhookEvent["data"];
      if (!data.upload_id) {
        return new Response("No upload ID found", { status: 400 });
      }

      await db
        .update(videos)
        .set({ muxAssetId: data.id, muxStatus: data.status })
        .where(eq(videos.muxUploadId, data.upload_id));

      break;
    }

    case "video.asset.ready": {
      /**
       * 1. Get webhook data (thumbnailUrl,previewUrl,duration .eg.)
       * 2. If get the mux data, start a workflow to process the large time task,and return the 200 status to mux immediately.
       * 3. Upload image to UploadThing from mux data.
       * 4. Save data in db.
       */
      console.log("---: ready START");
      // Step 1 START
      const data = payload.data as VideoAssetReadyWebhookEvent["data"];
      const playbackId = data.playback_ids?.[0].id;

      if (!data.upload_id)
        return new Response("Missing upload ID", { status: 400 });

      if (!playbackId)
        return new Response("Missing playback ID", { status: 400 });

      const tempThumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
      const tempPreviewUrl = `https://image.mux.com/${playbackId}/animated.gif`;
      const duration = data.duration ? Math.round(data.duration * 1000) : 0;

      // START a upstash workflow to handle time-consuming tasks that may take a lot of time.
      workflow.trigger({
        url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/save-img`,
        body: {
          data,
          tempThumbnailUrl,
          tempPreviewUrl,
          duration,
          playbackId,
          upload_id: data.upload_id,
        },
      });
      console.log("---: ready END");

      break;
    }

    case "video.asset.errored": {
      const data = payload.data as VideoAssetErroredWebhookEvent["data"];

      if (!data.upload_id)
        return new Response("Missing upload ID", { status: 400 });

      await db
        .update(videos)
        .set({
          muxStatus: data.status,
        })
        .where(eq(videos.muxUploadId, data.upload_id));

      break;
    }

    case "video.asset.deleted": {
      const data = payload.data as VideoAssetDeletedWebhookEvent["data"];

      if (!data.upload_id)
        return new Response("Missing upload ID", { status: 400 });

      await db.delete(videos).where(eq(videos.muxUploadId, data.upload_id));

      break;
    }

    case "video.asset.track.ready": {
      const data = payload.data as VideoAssetTrackReadyWebhookEvent["data"] & {
        asset_id: string;
      };

      const assetId = data.asset_id;
      const trackId = data.id;
      const status = data.status;

      if (!assetId) return new Response("Missing asset ID", { status: 400 });

      await db
        .update(videos)
        .set({
          muxTrackId: trackId,
          muxTrackStatus: status,
        })
        .where(eq(videos.muxAssetId, assetId));

      break;
    }

    default:
      break;
  }

  return new Response("Webhook received", { status: 200 });
};
