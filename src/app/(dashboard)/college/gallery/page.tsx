import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ImageIcon } from "lucide-react";

export const metadata: Metadata = { title: "Gallery" };

export default async function CollegeGalleryPage() {
  await requireRole(["COLLEGE_ADMIN"]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gallery</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your college photos</p>
      </div>
      <div className="border-2 border-dashed rounded-lg p-16 text-center text-muted-foreground">
        <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No photos uploaded</p>
        <p className="text-sm mt-1">Upload photos to showcase your campus</p>
      </div>
    </div>
  );
}
