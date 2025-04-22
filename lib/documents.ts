import { getDocumentById as getDocById } from "./actions"

export async function getDocumentById(id: string) {
  try {
    const document = await getDocById(id)

    // If document is null, log it but don't throw an error
    if (!document) {
      console.log(`Document with ID ${id} not found`)
    }

    return document
  } catch (error) {
    console.error("Error in getDocumentById:", error)
    return null
  }
}
