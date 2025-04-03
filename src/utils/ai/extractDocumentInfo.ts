
import { extractPdfText } from "../pdf/extractPdfText";
import enhanceDocumentInfo from "./determineViolationType";
import { ViolationType } from "../../types/database.types";

export interface DocumentInfo {
  extractedText: string;
  studentId?: string;
  studentName?: string;
  courseCode?: string;
  violationType?: ViolationType;
  pdfTitle?: string;
  natureOfExcuse?: string;
  submissionDate?: string;
}

/**
 * Extract information from a PDF document
 */
export async function extractDocumentInfo(file: File): Promise<DocumentInfo> {
  try {
    console.log("Starting document info extraction for:", file.name);
    
    // Extract text from PDF
    const text = await extractPdfText(file);
    
    // Create basic document info object
    let documentInfo: DocumentInfo = {
      extractedText: text,
      pdfTitle: file.name,
      submissionDate: new Date().toISOString(),
      // Set default nature of excuse right away to ensure it's always available
      natureOfExcuse: "for my absences in your Application Development class"
    };
    
    // Extract student ID (numbers)
    const studentIdMatch = text.match(/\b\d{8,10}\b/);
    if (studentIdMatch) {
      documentInfo.studentId = studentIdMatch[0];
      console.log("Found student ID:", documentInfo.studentId);
    }

    // Extract student name
    const nameMatch = text.match(/(?:I|My name is|This is)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) {
      documentInfo.studentName = nameMatch[1];
      console.log("Found student name:", documentInfo.studentName);
    }

    // Extract course code
    const courseMatch = text.match(/\b[A-Z]{2,4}\s*\d{3,4}\b/);
    if (courseMatch) {
      documentInfo.courseCode = courseMatch[0];
      console.log("Found course code:", documentInfo.courseCode);
    }

    // Enhance the document info
    const enhancedInfo = enhanceDocumentInfo(documentInfo);
    console.log("Enhanced document info:", enhancedInfo);
    
    // Double-check that we have the natureOfExcuse
    if (!enhancedInfo.natureOfExcuse) {
      console.warn("Nature of excuse is missing after enhancement, using default");
      enhancedInfo.natureOfExcuse = "for my absences in your Application Development class";
    }
    
    return enhancedInfo;
  } catch (error) {
    console.error("Error in extractDocumentInfo:", error);
    
    // Even in case of error, return an object with default values
    return {
      extractedText: "Error extracting text from document",
      pdfTitle: file.name,
      submissionDate: new Date().toISOString(),
      natureOfExcuse: "for my absences in your Application Development class",
      violationType: "Other"
    };
  }
}

export default extractDocumentInfo;
