// c:\Users\ramaw\firebase-studio-project\src\lib\actions.ts
"use server";

import { z } from "zod";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, storage } from "./firebase"; // Pastikan path ini benar dan file firebase.ts/js mengekspor db dan storage
import { revalidatePath } from "next/cache";

const LogSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  mainCaption: z.string().max(200, "Main caption must be 200 characters or less").optional(),
  supportingItems: z.array(
    z.object({
      caption: z.string().max(200, "Caption must be 200 characters or less").optional(),
      image: z.any().optional(), // Tetap any untuk saat ini, validasi file dilakukan terpisah
    })
  ).length(8, "Exactly 8 supporting items required."), // MAX_SUPPORTING_ITEMS
  relatedLogIds: z.array(z.string()).optional(),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SUPPORTING_ITEMS = 8;
const MAX_TOTAL_IMAGES = 9; // Main image + 8 supporting items

const FileSchema = z.instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
  );

export async function createLogAction(prevState: any, formData: FormData) {
  console.log('--- [createLogAction] Invoked ---');
  console.log('[createLogAction] FormData entries:', Array.from(formData.entries()).map(([key, value]) => ({ key, value: value instanceof File ? { name: value.name, size: value.size, type: value.type } : value })));

  // Test write to Firestore (optional, for debugging connection)
  try {
    const testDocRef = doc(db, "test_collection", "test_doc_" + Date.now());
    const testData = { message: "Hello from createLogAction", timestamp: serverTimestamp(), testId: Math.random() };
    await setDoc(testDocRef, testData);
    console.log('[createLogAction] Successfully wrote to test_collection with testId:', testData.testId);
  } catch (e) {
    console.error('[createLogAction] Error writing to test_collection:', e);
  }

  // Check Firebase instances (optional, for debugging)
  if (storage) {
    console.log('[createLogAction] Storage Emulator Config:', (storage as any)._emulator);
  } else {
    console.error('[createLogAction] Storage instance is not available!');
  }
  if (db) {
    console.log('[createLogAction] Firestore Emulator Config:', (db as any)._settings?.host, (db as any)._settings?.ssl);
  } else {
    console.error('[createLogAction] DB instance is not available!');
  }

  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const mainImage = formData.get("mainImage");
  const mainCaption = formData.get("mainCaption") as string;

  const supportingItemsData = Array.from({ length: MAX_SUPPORTING_ITEMS }).map((_, i) => {
    const imageFile = formData.get(`supportingItems[${i}].image`);
    const captionValue = formData.get(`supportingItems[${i}].caption`);
    return {
      image: imageFile instanceof File && imageFile.size > 0 ? imageFile : null,
      caption: typeof captionValue === 'string' ? captionValue : "",
    };
  });
  const relatedLogIds = formData.getAll("relatedLogIds") as string[];

  console.log('[createLogAction] formData mainImage:', mainImage instanceof File ? { name: mainImage.name, size: mainImage.size, type: mainImage.type } : mainImage);
  console.log('[createLogAction] formData mainCaption:', mainCaption);
  console.log('[createLogAction] formData supportingItems:', supportingItemsData.map((item, i) => ({
    index: i,
    image: item.image ? { name: item.image.name, size: item.image.size, type: item.image.type } : null,
    caption: item.caption,
  })));

  const validatedFields = LogSchema.safeParse({
    title: rawTitle,
    description: rawDescription,
    mainCaption,
    supportingItems: supportingItemsData,
    relatedLogIds,
  });

  if (!validatedFields.success) {
    console.log('[createLogAction] Validation failed for fields:', validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const imageUrls: { url: string | null; isMain: boolean; caption?: string }[] = [];
  let totalImages = 0;

  if (mainImage instanceof File && mainImage.size > 0) {
    const validatedFile = FileSchema.safeParse(mainImage);
    if (!validatedFile.success) {
      console.log('[createLogAction] Validation failed for main image:', validatedFile.error.flatten().formErrors);
      return {
        success: false,
        message: "Invalid main image file.",
        errors: { mainImage: validatedFile.error.flatten().formErrors },
      };
    }
    try {
      const storageRef = ref(storage, `logs/${Date.now()}_${mainImage.name}`);
      await uploadBytes(storageRef, mainImage);
      const url = await getDownloadURL(storageRef);
      imageUrls.push({
        url,
        isMain: true,
        caption: validatedFields.data.mainCaption || undefined,
      });
      totalImages++;
      console.log(`[createLogAction] Main image ${mainImage.name} uploaded successfully to: ${url}`);
    } catch (error) {
      console.error("[createLogAction] Error uploading main image:", error);
      return { success: false, message: "Failed to upload main image." };
    }
  } else if (validatedFields.data.mainCaption) { // Main image not provided, but caption is
    imageUrls.push({
      url: null,
      isMain: true,
      caption: validatedFields.data.mainCaption,
    });
  }

  for (let i = 0; i < MAX_SUPPORTING_ITEMS; i++) {
    const item = supportingItemsData[i];
    const imageFile = item.image;
    const caption = item.caption;

    if (imageFile) {
      const validatedFile = FileSchema.safeParse(imageFile);
      if (!validatedFile.success) {
        console.log('[createLogAction] Validation failed for supporting image at index', i, ':', validatedFile.error.flatten().formErrors);
        return {
          success: false,
          message: `Invalid supporting image at item ${i + 1}.`,
          errors: { [`supportingItems[${i}].image`]: validatedFile.error.flatten().formErrors },
        };
      }
      totalImages++;
      if (totalImages > MAX_TOTAL_IMAGES) {
        console.log('[createLogAction] Total images exceed maximum:', totalImages);
        return { success: false, message: `Maximum ${MAX_TOTAL_IMAGES} images allowed.` };
      }
      try {
        const storageRef = ref(storage, `logs/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        const url = await getDownloadURL(storageRef);
        imageUrls.push({
          url,
          isMain: false,
          caption: caption || undefined,
        });
        console.log(`[createLogAction] Supporting image ${imageFile.name} (index ${i}) uploaded successfully to: ${url}`);
      } catch (error) {
        console.error("[createLogAction] Error uploading supporting image at index", i, ":", error);
        return { success: false, message: `Failed to upload supporting image at item ${i + 1}.` };
      }
    } else if (caption) { // No image file, but caption is provided
      imageUrls.push({
        url: null,
        isMain: false,
        caption: caption,
      });
    }
  }

  console.log('[createLogAction] Firestore DB instance details:', db);
  console.log('[createLogAction] Firestore DB app name:', db.app.name);
  console.log('[createLogAction] Firestore DB project ID (from app options):', db.app.options.projectId);
  const dataToSave = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    imageUrls,
    relatedLogs: validatedFields.data.relatedLogIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  console.log('[createLogAction] Attempting to save log to Firestore with data:', JSON.stringify(dataToSave, null, 2));

  try {
    console.log('[createLogAction] Attempting to save log to Firestore...');
    await addDoc(collection(db, "logs"), dataToSave);
    console.log('[createLogAction] Log saved to Firestore successfully.');

    revalidatePath("/");
    revalidatePath("/logs");
    return { success: true, message: "Log created successfully!" };
  } catch (error) {
    console.error("[createLogAction] Error during log Firestore save process:", error);
    let errorMessage = "Failed to create log. An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = `Firebase Error: ${error.message}`;
    }
    return { success: false, message: errorMessage };
  }
}

export async function editLogAction(prevState: any, formData: FormData) {
  console.log('--- [editLogAction] Invoked ---');
  if (!(formData instanceof FormData)) {
    console.error('[editLogAction] Received formData is NOT an instance of FormData.');
    return { success: false, message: "Invalid form data received." };
  }
  console.log('[editLogAction] FormData entries:', Array.from(formData.entries()).map(([key, value]) => ({ key, value: value instanceof File ? { name: value.name, size: value.size, type: value.type } : value })));

  const id = formData.get("id") as string;
  if (!id) {
    console.error('[editLogAction] Log ID is missing in formData.');
    return { success: false, message: "Log ID is required for editing." };
  }

  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const mainImage = formData.get("mainImage");
  const mainCaption = formData.get("mainCaption") as string;

  const supportingItemsData = Array.from({ length: MAX_SUPPORTING_ITEMS }).map((_, i) => {
    const imageFile = formData.get(`supportingItems[${i}].image`);
    const captionValue = formData.get(`supportingItems[${i}].caption`);
    return {
      image: imageFile instanceof File && imageFile.size > 0 ? imageFile : null,
      caption: typeof captionValue === 'string' ? captionValue : "",
    };
  });
  const existingImageUrlsRaw = formData.get("existingImageUrls") as string | null;
  const relatedLogIds = formData.getAll("relatedLogIds") as string[];

  console.log(`[editLogAction] Log ID: ${id}`);
  console.log('[editLogAction] formData mainImage:', mainImage instanceof File ? { name: mainImage.name, size: mainImage.size, type: mainImage.type } : mainImage);
  console.log('[editLogAction] formData mainCaption:', mainCaption);
  console.log('[editLogAction] formData supportingItems:', supportingItemsData.map((item, i) => ({
    index: i,
    image: item.image ? { name: item.image.name, size: item.image.size, type: item.image.type } : null,
    caption: item.caption,
  })));
  console.log('[editLogAction] formData existingImageUrlsRaw:', existingImageUrlsRaw);

  const validatedFields = LogSchema.safeParse({
    title: rawTitle,
    description: rawDescription,
    mainCaption,
    supportingItems: supportingItemsData,
    relatedLogIds,
  });

  if (!validatedFields.success) {
    console.log('[editLogAction] Validation failed for fields:', validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  let finalImageUrls: { url: string | null; isMain: boolean; caption?: string }[] = [];

  if (existingImageUrlsRaw) {
    try {
      const existingImagesFromForm = JSON.parse(existingImageUrlsRaw) as { url: string; isMain?: boolean; caption?: string }[];
      finalImageUrls = existingImagesFromForm.map(img => ({
        url: img.url,
        isMain: img.isMain || false,
        caption: img.caption || undefined,
      }));
      console.log(`[editLogAction] Initialized with ${finalImageUrls.length} existing images from form.`);
    } catch (error) {
      console.error("[editLogAction] Error parsing existingImageUrls:", error);
      return { success: false, message: "Invalid existing images data format." };
    }
  }

  let currentTotalImages = finalImageUrls.filter(img => img.url !== null).length;

  // Handle new main image upload
  if (mainImage instanceof File && mainImage.size > 0) {
    const validatedFile = FileSchema.safeParse(mainImage);
    if (!validatedFile.success) {
      console.log('[editLogAction] Validation failed for new main image:', validatedFile.error.flatten().formErrors);
      return {
        success: false,
        message: "Invalid new main image file.",
        errors: { mainImage: validatedFile.error.flatten().formErrors },
      };
    }

    const oldMainImageIndex = finalImageUrls.findIndex(img => img.isMain);
    if (oldMainImageIndex === -1) {
      currentTotalImages++;
    }

    if (currentTotalImages > MAX_TOTAL_IMAGES && oldMainImageIndex === -1) {
      console.log('[editLogAction] Total images exceed maximum after adding new main image:', currentTotalImages);
      return { success: false, message: `Maximum ${MAX_TOTAL_IMAGES} images allowed.` };
    }

    try {
      const storageRef = ref(storage, `logs/${Date.now()}_${mainImage.name}`);
      await uploadBytes(storageRef, mainImage);
      const newMainImageUrl = await getDownloadURL(storageRef);

      finalImageUrls = finalImageUrls.filter(img => !img.isMain);
      finalImageUrls.push({
        url: newMainImageUrl,
        isMain: true,
        caption: validatedFields.data.mainCaption || undefined,
      });
      console.log(`[editLogAction] New main image ${mainImage.name} uploaded successfully to: ${newMainImageUrl}`);
    } catch (error) {
      console.error("[editLogAction] Error uploading new main image:", error);
      return { success: false, message: "Failed to upload new main image." };
    }
  } else {
    const existingMainImage = finalImageUrls.find(img => img.isMain);
    if (existingMainImage) {
      existingMainImage.caption = validatedFields.data.mainCaption || undefined;
    } else if (validatedFields.data.mainCaption) {
      finalImageUrls.push({
        url: null,
        isMain: true,
        caption: validatedFields.data.mainCaption,
      });
    }
  }

  // Handle new supporting images upload and existing ones
  const updatedSupportingImageUrls: { url: string | null; isMain: boolean; caption?: string }[] = [];
  const existingSupportingImagesFromFinal = finalImageUrls.filter(img => !img.isMain);

  for (let i = 0; i < MAX_SUPPORTING_ITEMS; i++) {
    const { image: newImageFile, caption: newCaption } = supportingItemsData[i];
    let finalUrl: string | null = null;
    let finalCaption: string | undefined = newCaption || undefined;

    const correspondingExistingImage = existingSupportingImagesFromFinal[i];

    if (newImageFile) {
      const validatedFile = FileSchema.safeParse(newImageFile);
      if (!validatedFile.success) {
        return {
          success: false,
          message: `Invalid supporting image at item ${i + 1}.`,
          errors: { [`supportingItems[${i}].image`]: validatedFile.error.flatten().formErrors },
        };
      }

      if (!correspondingExistingImage || !correspondingExistingImage.url) {
        currentTotalImages++;
      }

      if (currentTotalImages > MAX_TOTAL_IMAGES) {
        console.log('[editLogAction] Total images exceed maximum with new supporting image:', currentTotalImages);
        return { success: false, message: `Maximum ${MAX_TOTAL_IMAGES} images allowed.` };
      }

      try {
        const storageRef = ref(storage, `logs/${Date.now()}_${newImageFile.name}`);
        await uploadBytes(storageRef, newImageFile);
        finalUrl = await getDownloadURL(storageRef);
        console.log(`[editLogAction] New supporting image ${newImageFile.name} for item ${i+1} uploaded to: ${finalUrl}`);
      } catch (error) {
        return { success: false, message: `Failed to upload supporting image at item ${i + 1}.` };
      }
    } else if (correspondingExistingImage && correspondingExistingImage.url) {
      finalUrl = correspondingExistingImage.url;
      if (!newCaption && correspondingExistingImage.caption) {
        finalCaption = correspondingExistingImage.caption;
      }
    }

    if (finalUrl || finalCaption) {
      updatedSupportingImageUrls.push({
        url: finalUrl,
        isMain: false,
        caption: finalCaption,
      });
    }
  }

  finalImageUrls = finalImageUrls.filter(img => img.isMain).concat(updatedSupportingImageUrls);

  if (finalImageUrls.length > 0 && !finalImageUrls.some(img => img.isMain && img.url !== null)) {
    const firstValidImageIndex = finalImageUrls.findIndex(img => img.url !== null);
    if (firstValidImageIndex !== -1) {
      finalImageUrls[firstValidImageIndex].isMain = true;
    }
  }
  
  finalImageUrls = finalImageUrls.filter(img => img.url || img.caption);

  const updateData: any = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    imageUrls: finalImageUrls,
    relatedLogs: validatedFields.data.relatedLogIds || [],
    updatedAt: serverTimestamp(),
  };
  console.log(`[editLogAction] Attempting to update log with ID: ${id} in Firestore with data:`, JSON.stringify(updateData, null, 2));

  try {
    await updateDoc(doc(db, "logs", id), updateData);
    console.log('[editLogAction] Log updated successfully in Firestore.');

    revalidatePath("/");
    revalidatePath("/logs");
    revalidatePath(`/logs/${id}`);
    revalidatePath(`/logs/${id}/edit`);
    revalidatePath(`/mindmap/${id}`);
    return { success: true, message: "Log updated successfully!" };
  } catch (error) {
    console.error("[editLogAction] Error during log Firestore update process:", error);
    let errorMessage = "Failed to update log. An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = `Firebase Error: ${error.message}`;
    }
    return { success: false, message: errorMessage };
  }
}
