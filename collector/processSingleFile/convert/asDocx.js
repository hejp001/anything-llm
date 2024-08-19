const { v4 } = require("uuid");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");
const { generateLocalfileChunkSource } = require("../../utils/metadata");

async function asDocx({ fullFilePath = "", filename = "", options = {} }) {
  const loader = new DocxLoader(fullFilePath);

  console.log(`-- Working ${filename} --`);
  let pageContent = [];
  const docs = await loader.load();
  for (const doc of docs) {
    console.log(`-- Parsing content from docx page --`);
    if (!doc.pageContent.length) continue;
    pageContent.push(doc.pageContent);
  }

  if (!pageContent.length) {
    console.error(`Resulting text content was empty for ${filename}.`);
    trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const content = pageContent.join("");
  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: filename,
    docAuthor: "no author found",
    description: "No description found.",
    docSource: "pdf file uploaded by the user.",
    chunkSource: generateLocalfileChunkSource({ filename, ...options }, ""),
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
    pageContent: content,
    token_count_estimate: tokenizeString(content).length,
  };

  const document = writeToServerDocuments(
    data,
    `${slugify(filename)}-${data.id}`
  );
  trashFile(fullFilePath);
  console.log(`[SUCCESS]: ${filename} converted & ready for embedding.\n`);
  return { success: true, reason: null, documents: [document] };
}

async function resyncDocx({ fullFilePath = "", filename = "" }) {
  const loader = new DocxLoader(fullFilePath);

  console.log(`-- Syncing ${filename} --`);
  let pageContent = [];
  const docs = await loader.load();
  for (const doc of docs) {
    console.log(doc.metadata);
    console.log(`-- Parsing content from docx page --`);
    if (!doc.pageContent.length) continue;
    pageContent.push(doc.pageContent);
  }

  if (!pageContent.length) {
    console.error(`Resulting text content was empty for ${filename}.`);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      content: null,
    };
  }

  const content = pageContent.join("");
  console.log(`[SYNC SUCCESS]: ${filename} content was able to be synced.\n`);
  return { success: true, reason: null, content };
}

module.exports = { asDocx, resyncDocx };
