# Exam Slicer Web App

This is a **client-side React application** that automates the creation of categorized exam study guides from a collection of raw PDF exams. It utilizes `pdf-lib` directly in the browser, meaning **zero server dependencies** and **complete privacy**—no files are uploaded anywhere.

## The Workflow
1. **Generate Rules**: The app provides a pre-baked LLM prompt. Tell ChatGPT, Gemini, or Claude what files you have and what questions belong to what category. The LLM will return a strict JSON structure.
2. **Upload Local PDFs**: Drag and drop your local exams directly into the browser.
3. **Combine & Generate**: Paste your generated JSON structure. The app locally unpacks the PDFs, extracts the precise pages, dynamically injects category "Divider" title pages, correctly bullet-points your questions, stamps the pages with red text in the top-right corner to identify the year/question, and immediately triggers an automatic download of your final "Master Study Guide" PDF.

## Running Locally

1. Open your terminal in this repository.
2. Run `npm install` to grab the dependencies (`pdf-lib`, `lucide-react`, etc.).
3. Run `npm run dev` to start the local Vite server.
4. Navigate to `http://localhost:5173`.

## Deployment
Because the web app operates completely client-side via React and Vanilla CSS, you can deploy it practically instantly and for free.

**To deploy to Cloudflare Pages:**
1. Run `npm run build` in this directory to compile your asset into the `dist/` folder.
2. Go to the Cloudflare dashboard. Select **Workers & Pages** -> **Create application** -> **Pages**.
3. Drag and drop the `dist/` directory into the direct-upload GUI. 
4. Your site will immediately be live!

*Optionally, push this repository to GitHub and link it to Cloudflare Pages using the `npm run build` build command and `dist` build directory for automatic deployment on commits.*
