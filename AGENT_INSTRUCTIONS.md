# Exam PDF Slicer & Merger - AI Agent Instructions

Hello AI Agent! 
If you are reading this, the user wants you to extract specific questions from a batch of PDF exams and merge them into a new categorized Master Study Guide PDF. 

**Your Goal:** Generate a strict JSON mapping based on the user's exam requirements, then run the standard Python `fitz` (PyMuPDF) script below to construct the final PDF.

---

## Step 1: Generate the JSON Mapping
When the user provides a list of questions, file names, and years, you must extract that data and output a strictly formatted JSON file (e.g., `mapping.json`). 

**JSON Schema Requirements:**
1. `categoryName`: The title of the section (e.g., "1. Cost Estimation").
2. `subtitle`: A comma-separated list of the questions in this category (this will be rendered as a bulleted list on the divider page).
3. `pagesToExtract`: An array of objects containing:
   - `fileName`: The exact local filename of the PDF.
   - `pageNumber`: The **1-indexed** human-readable page number to extract.
   - `stampText`: The bold text to stamp in the top-right corner over the duplicated page (e.g., "2021 - Q1").

**Example JSON Output:**
```json
{
  "categories": [
    {
      "categoryName": "1. Cost Estimation",
      "subtitle": "2021 Q1, 2022 Q2, 2023 Q1, 2024 Q1",
      "pagesToExtract": [
        {
          "fileName": "APSC221_FinalExam_Fall2021.pdf",
          "pageNumber": 2,
          "stampText": "2021 - Q1"
        }
      ]
    }
  ]
}
```

---

## Step 2: Execute the Python Generator
Once you have saved the user's mapping to a local JSON file (e.g., `mapping.json`), save and execute the following Python script. **Do not deviate from this script unless requested.** It handles:
- Zero-indexing the page numbers for PyMuPDF (`fitz`).
- Centering category titles and bulleting the subtitles on blank divider pages.
- Overlaying the red `stampText` cleanly in the top-right corner of each duplicated exam page.

### The Python Script (`generate_study_guide.py`)

```python
import fitz
import json
import os

# WARNING TO AI: Update this filename to match the JSON file you generated above.
INPUT_JSON = "mapping.json"
OUTPUT_PDF = "Master_Study_Guide.pdf"

with open(INPUT_JSON, "r") as f:
    config = json.load(f)

def create_title_page(doc, title_text, subtitle_text):
    page = doc.new_page()
    rect = page.rect
    
    # Center title text
    title_rect = fitz.Rect(50, rect.height/2 - 150, rect.width - 50, rect.height/2 - 50)
    page.insert_textbox(title_rect, title_text, fontsize=24, fontname="helv-bo", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
    
    # Subtitle listed out
    bullet_y = rect.height/2
    page.insert_text(fitz.Point(100, bullet_y - 30), "Includes:", fontsize=18, fontname="helv-bo", color=(0,0,0))
    
    # Simple split of subtitle by comma for bullets
    bullets = [b.strip() for b in subtitle_text.split(",")]
    
    for b in bullets:
        page.insert_text(fitz.Point(120, bullet_y), f"• {b}", fontsize=16, fontname="helv", color=(0,0,0))
        bullet_y += 30
        
    # Top right corner text for category
    top_right_rect = fitz.Rect(rect.width - 350, 20, rect.width - 20, 60)
    page.insert_textbox(top_right_rect, title_text, fontsize=12, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_RIGHT)

def main():
    master_pdf = fitz.open()

    for category in config['categories']:
        cat_name = category['categoryName']
        subtitle = category['subtitle']
        pages_to_extract = category['pagesToExtract']
        
        print(f"Processing Category: {cat_name}")
        create_title_page(master_pdf, cat_name, subtitle)
        
        for page_data in pages_to_extract:
            filename = page_data['fileName']
            p_index = page_data['pageNumber'] - 1 # Zero-indexed
            overlay_text = page_data['stampText']
            
            if not os.path.exists(filename):
                print(f"  Missing file: {filename}")
                continue
                
            try:
                src_doc = fitz.open(filename)
                
                if p_index < 0 or p_index >= len(src_doc):
                    print(f"  Warning: Page {p_index + 1} does not exist in {filename}. Skipping.")
                    continue
                    
                # Insert page
                master_pdf.insert_pdf(src_doc, from_page=p_index, to_page=p_index)
                
                new_page = master_pdf[-1]
                rect = new_page.rect
                text_rect = fitz.Rect(rect.width - 400, 20, rect.width - 20, 60)
                
                # Stark red bold text mapped as string overlay
                new_page.insert_textbox(text_rect, overlay_text, fontsize=18, fontname="helv-bo", color=(1, 0, 0), align=fitz.TEXT_ALIGN_RIGHT)
                
                src_doc.close()
                print(f"  Merged page {p_index+1} from {filename} with stamp '{overlay_text}'")
            except Exception as e:
                print(f"  Error processing {filename}: {e}")

    master_pdf.save(OUTPUT_PDF)
    master_pdf.close()
    
    print(f"Successfully saved master PDF to {OUTPUT_PDF}")

if __name__ == "__main__":
    main()
```

## AI Agent Action Checklist:
1. Parse the user's exam constraints into the specific JSON format.
2. Save it to `mapping.json`.
3. Create `generate_study_guide.py` using the exact code above.
4. Run `python generate_study_guide.py`.
5. Provide the output PDF back to the user!
