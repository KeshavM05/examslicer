import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, Copy, Check, FileText, AlertCircle, FileUp, Loader2, X } from 'lucide-react';
import './index.css';

const DEFAULT_PROMPT = `System Role & Objective
You are a Senior Academic Strategist and Data Extraction Engine. Your mission is to perform a longitudinal analysis on a provided set of engineering exam documents to build a "Predictive Success Framework." You must identify the underlying "Problem Archetypes" (the logic/DNA of the questions) and calculate the "Yield" (points vs. learning effort) for every recurring topic.

Your goal is not to make decisions for the user, but to equip them with an Objective Data Dashboard that allows them to see exactly where marks are hidden and how to spend their limited time to reach their target (typically 50%).

Phase 1: Deep Data Analysis (Internal Process)
Before generating any output, you must internally perform a multi-dimensional analysis:

Archetype Identification: Group questions that share the same underlying mathematical or logical "recipe." Treat variations in physical setups (e.g., different robot geometries) as unique sub-types of the same archetype.

Frequency & Mark Weighting: Analyze the past 5-10 years to determine how many marks each archetype contributes to the total exam on average.

Redundancy Filtering: Prioritize the most recent 3 years for specific data mapping, as these best reflect current instructor trends.

Multi-Page Verification: Actively check the bottom of every page. If a question, diagram, or part of a sub-problem continues onto the next page, you must flag both pages for extraction.

Phase 2: Technical Data Extraction (JSON Output)
You must output ONLY valid, minified JSON first. No conversational text, no markdown code blocks.
Data Schema:

JSON
{
  "examMetadata": {
    "totalUniqueArchetypes": "Number",
    "examPredictabilityScore": "String (0-100% based on consistency)",
    "estimatedPassThresholdMarks": "Number"
  },
  "categories": [
    {
      "categoryName": "String (e.g., '1. Topic Title')",
      "statisticalYield": "String (Average marks per exam + % of total paper)",
      "subtitle": "String (List of questions included, e.g., '2025 Q1, 2022 Q3')",
      "pagesToExtract": [
        {
          "fileName": "String (Exact PDF name)",
          "pageNumber": "Number (Integer)",
          "stampText": "String (Label, e.g., '2025 - Q1 [Topic Name]')"
        }
      ]
    }
  ],
  "uncategorized": [
     {
       "fileName": "String",
       "pageNumber": "Number",
       "stampText": "String"
     }
  ]
}
Phase 3: The Strategic Game Plan (Human-Readable Dashboard)
After the JSON, provide an exhaustive, objective "Master Plan" for the user. Do not make recommendations; provide the data they need to make their own choices.

1. The Yield & ROI Matrix (Table)
Provide a table with the following columns: Topic | Average Marks | Learning Complexity (Low/Med/High) | Frequency (%).

2. The Frequency Heatmap
A list or table showing which years each topic appeared. This allows the user to see if a topic is "trending" or "rotational."

3. Analysis of Professor "Twists"
Identify any "niche" or "edge case" questions that only appear once every few years. Label these so the user can decide if they are worth the effort.

Extraction & Accuracy Rules
The Spanning Rule: If a question or its required diagrams span multiple pages, you MUST duplicate that page object into the JSON for every relevant page.

Zero-Inference Mapping: Treat the data as immutable facts. Do not "guess" a page number; verify it.

Minimalist Selection: Even if a topic is frequent, only extract the most unique or most representative versions of that question.

Analyze the provided documents and generate the Complete Strategic Analysis now.`;

interface PDFMap {
  [filename: string]: ArrayBuffer;
}

function App() {
  const [copied, setCopied] = useState(false);
  const [pdfs, setPdfs] = useState<PDFMap>({});
  const [jsonInput, setJsonInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(DEFAULT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPdfs: PDFMap = { ...pdfs };
    let filesProcessed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPdfs[file.name] = event.target.result as ArrayBuffer;
        }
        filesProcessed++;
        if (filesProcessed === files.length) {
          setPdfs(newPdfs);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const removePdf = (filename: string) => {
    const newPdfs = { ...pdfs };
    delete newPdfs[filename];
    setPdfs(newPdfs);
  };

  const createTitlePage = async (pdfDoc: PDFDocument, titleText: string, subtitleText: string) => {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Add a blank page
    const page = pdfDoc.addPage([612, 792]); // Standard 8.5x11 inches
    const { width, height } = page.getSize();
    
    // Draw Category Title
    page.drawText(titleText, {
      x: 50,
      y: height / 2 + 100,
      size: 24,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    // Draw Top Right Category Name
    const topRightTextWidth = fontRegular.widthOfTextAtSize(titleText, 12);
    page.drawText(titleText, {
      x: width - topRightTextWidth - 30,
      y: height - 40,
      size: 12,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    // Draw subtitle "Includes:"
    page.drawText("Includes:", {
      x: 100,
      y: height / 2 + 50,
      size: 18,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Draw bullets
    const bullets = subtitleText.split(',').map(b => b.trim());
    let currentY = height / 2 + 20;
    
    for (const bullet of bullets) {
      page.drawText(`• ${bullet}`, {
        x: 120,
        y: currentY,
        size: 14,
        font: fontRegular,
        color: rgb(0, 0, 0)
      });
      currentY -= 25;
    }
  };

  const generatePDF = async () => {
    setErrorText('');
    setSuccessText('');
    
    if (Object.keys(pdfs).length === 0) {
      setErrorText("Please upload at least one PDF file.");
      return;
    }
    
    if (!jsonInput.trim()) {
      setErrorText("Please paste the JSON map generated by the LLM.");
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Parse JSON
      const config = JSON.parse(jsonInput);
      if (!config.categories) throw new Error("Invalid JSON: Missing 'categories' array.");

      // 2. Create Master Document
      const masterPdf = await PDFDocument.create();
      const loadedSourcePdfs: { [filename: string]: PDFDocument } = {};

      for (const [filename, buffer] of Object.entries(pdfs)) {
        loadedSourcePdfs[filename] = await PDFDocument.load(buffer);
      }

      const fontBold = await masterPdf.embedFont(StandardFonts.HelveticaBold);

      // 3. Process each category
      for (const category of config.categories) {
        const catName = category.categoryName || "Uncategorized";
        const subtitle = category.subtitle || "";
        const pagesToExtract = category.pagesToExtract || [];

        // Create the title page
        await createTitlePage(masterPdf, catName, subtitle);

        for (const pageData of pagesToExtract) {
          const filename = pageData.fileName;
          const pIndex = (pageData.pageNumber || 1) - 1; // 0-indexed
          const stampText = pageData.stampText || "";

          const sourcePdf = loadedSourcePdfs[filename];
          if (!sourcePdf) {
            console.warn(`File ${filename} not found in uploads.`);
            continue;
          }

          if (pIndex < 0 || pIndex >= sourcePdf.getPageCount()) {
            console.warn(`Page ${pIndex + 1} does not exist in ${filename}.`);
            continue;
          }

          const [copiedPage] = await masterPdf.copyPages(sourcePdf, [pIndex]);
          masterPdf.addPage(copiedPage);

          const { width, height } = copiedPage.getSize();
          copiedPage.drawText(stampText, {
            x: width - fontBold.widthOfTextAtSize(stampText, 18) - 30, // Align rightish
            y: height - 50,
            size: 18,
            font: fontBold,
            color: rgb(1, 0, 0), // Red text
          });
        }
      }

      // 4. Serialize and Download
      const pdfBytes = await masterPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Master_Study_Guide.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessText('PDF Generated successfully!');

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "An error occurred while generating the PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="header-icon">
            <FileText size={32} />
          </div>
          <div>
            <h1>Exam Slicer</h1>
            <p className="desc">
              Automate the perfect master study guide. Upload your exact past PDFs, generate the structure via AI, and automatically slice and merge them locally.
            </p>
          </div>
        </div>
      </header>

      <div className="section-block split">
        <div>
          <span className="step-marker">Step 01</span>
          <h2>Generate LLM Rules</h2>
          <p className="desc">
            Copy this prompt to the AI, attach your PDFs, and generate the JSON structure.
          </p>
          <button onClick={handleCopyPrompt} className="btn btn-full">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied' : 'Copy Prompt'}
          </button>
        </div>

        <div>
          <span className="step-marker">Step 02</span>
          <h2>Upload Local PDFs</h2>
          <p className="desc">
            Upload the exact same PDF files you sent to the LLM. Processing happens purely in-browser.
          </p>
          
          <input 
            type="file" 
            multiple 
            accept=".pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="upload-zone"
          >
            <FileUp size={24} className="upload-icon" />
            <span className="upload-title">Select PDFs</span>
            <span className="upload-subtitle">No files are uploaded to any server</span>
          </div>
          
          {Object.keys(pdfs).length > 0 && (
            <div className="file-list">
              {Object.keys(pdfs).map(name => (
                <div key={name} className="file-item">
                  <span className="file-name" title={name}>{name}</span>
                  <button onClick={() => removePdf(name)} title="Remove">
                    <X size={14}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-block">
        <span className="step-marker">Step 03</span>
        <h2>Combine & Generate</h2>
        <p className="desc">
          Paste the JSON output precisely as generated by the AI model.
        </p>

        <textarea 
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"categories": [...]}'
          className="input-area"
          style={{ height: '160px', resize: 'vertical', marginBottom: '16px' }}
        />

        {errorText && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{errorText}</span>
          </div>
        )}

        {successText && (
          <div className="alert alert-success">
            <Check size={16} />
            <span>{successText}</span>
          </div>
        )}

        <div>
          <button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? <Loader2 size={18} className="spinner" /> : <Download size={18} />}
            {isGenerating ? 'Processing...' : 'Generate Master Study Guide'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
