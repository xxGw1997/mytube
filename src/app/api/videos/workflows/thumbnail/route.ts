// http://localhost:3000/api/videos/workflows/title

import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import { videos } from "~/db/schema";

interface InputType {
  userId: string;
  videoId: string;
  prompt: string;
}


export const { POST } = serve(async (context) => {
  // const input = context.requestPayload as InputType;
  // const { videoId, userId, prompt } = input;

  // const video = await context.run("get-video", async () => {
  //   const [existingVideo] = await db
  //     .select()
  //     .from(videos)
  //     .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

  //   if (!existingVideo) throw new Error("Not Found");

  //   return existingVideo;
  // });

  // const { body } = await context.call('generate-thumbnail', {
  //   url: 'https://api.openai.com/v1/images/generations'
  // })

  // const title = body.choices[0]?.message.content;
  // if (!title) throw new Error("Bad request");
  
  // await context.run("update-video", async () => {
  //   await db
  //     .update(videos)
  //     .set({ title: title || video.title })
  //     .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
  // });
});
