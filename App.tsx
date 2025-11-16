import React, { useState, useCallback } from 'react';
import type { Book, Chapter } from './types';
import { generateBookOutline, generateChapterContent, generateCoverImage, generateAlternativeTitles } from './services/geminiService';
import { createAndDownloadDocx } from './services/docxService';
import Icon from './components/Icon';

const App: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [language, setLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [generatedBook, setGeneratedBook] = useState<Book | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState<number>(12);
  const [lineSpacing, setLineSpacing] = useState<number>(1.5);

  const handleSuggestTitles = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a title to get suggestions.');
      return;
    }
    setIsSuggesting(true);
    setSuggestedTitles([]);
    setError(null);
    try {
      const titles = await generateAlternativeTitles(title, language);
      setSuggestedTitles(titles);
    } catch (e) {
      const err = e as Error;
      setError(`Could not generate suggestions: ${err.message}`);
    } finally {
      setIsSuggesting(false);
    }
  }, [title, language]);


  const handleGenerateBook = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a book title.');
      return;
    }

    setIsLoading(true);
    setGeneratedBook(null);
    setCoverImage(null);
    setError(null);
    setSuggestedTitles([]);

    try {
      setLoadingMessage('Step 1/3: Generating book outline...');
      const outline = await generateBookOutline(title, language);
      
      setLoadingMessage('Step 2/3: Generating content for all chapters... (this may take a few minutes)');
      const contentPromises: Promise<Chapter>[] = [
        generateChapterContent(title, outline.introductionTitle, outline.synopsis, language).then(content => ({ title: outline.introductionTitle, content })),
        ...outline.chapterTitles.map(chapterTitle => 
          generateChapterContent(title, chapterTitle, outline.synopsis, language).then(content => ({ title: chapterTitle, content }))
        ),
        generateChapterContent(title, outline.conclusionTitle, outline.synopsis, language).then(content => ({ title: outline.conclusionTitle, content })),
      ];
      
      const allContent = await Promise.all(contentPromises);
      
      setLoadingMessage('Step 3/3: Assembling your book...');

      const book: Book = {
        title: title,
        synopsis: outline.synopsis,
        introduction: allContent[0],
        chapters: allContent.slice(1, -1),
        conclusion: allContent[allContent.length - 1],
      };
      
      setGeneratedBook(book);

    } catch (e) {
      const err = e as Error;
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [title, language]);

  const handleGenerateCover = useCallback(async () => {
    if (!generatedBook) return;

    setIsCoverLoading(true);
    setError(null);
    try {
      const imageBase64 = await generateCoverImage(generatedBook.title, generatedBook.synopsis);
      setCoverImage(`data:image/jpeg;base64,${imageBase64}`);
    } catch (e) {
       const err = e as Error;
      setError(`Failed to generate cover: ${err.message}`);
    } finally {
      setIsCoverLoading(false);
    }
  }, [generatedBook]);

  const handleDownloadCover = () => {
    if (!coverImage || !generatedBook) return;
    const a = document.createElement('a');
    a.href = coverImage;
    a.download = `${generatedBook.title.replace(/ /g, '_')}_cover.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="bg-primary shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Icon type="book" className="w-10 h-10 text-white" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Book Weaver</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-surface p-6 sm:p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-4">Start Your Masterpiece</h2>
          <p className="text-text-secondary mb-6">Enter a title below, and our AI will write, format, and prepare a complete book for you, ready for publishing on Amazon KDP.</p>
          
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label htmlFor="book-title" className="block text-sm font-medium text-text-secondary mb-1">Book Title</label>
              <input
                id="book-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Secret of the Quantum Garden"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
                disabled={isLoading || isSuggesting}
              />
            </div>
            <div>
              <label htmlFor="language-select" className="block text-sm font-medium text-text-secondary mb-1">Generation Language</label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white appearance-none"
                disabled={isLoading || isSuggesting}
              >
                <option value="English">English</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={handleGenerateBook}
              disabled={isLoading || isSuggesting || !title}
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-hover transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Icon type="book" className="w-5 h-5"/>
              <span>{isLoading ? 'Weaving...' : 'Generate Book'}</span>
            </button>
          </div>

          <div className="mb-4">
            {suggestedTitles.length === 0 && !isSuggesting && (
                <div className="text-center">
                    <button
                        onClick={handleSuggestTitles}
                        disabled={isLoading || !title.trim()}
                        className="inline-flex items-center gap-2 py-2 px-4 bg-secondary text-primary font-bold rounded-md hover:bg-secondary-hover transition-colors duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <Icon type="sparkles" className="w-5 h-5"/>
                        <span>Suggest Titles</span>
                    </button>
                </div>
            )}

            {isSuggesting && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-4">
                <Icon type="spinner" className="w-6 h-6 text-primary"/>
                <p className="font-semibold text-primary">Thinking of catchy titles...</p>
                </div>
            )}

            {suggestedTitles.length > 0 && !isSuggesting && (
              <div className="p-4 bg-blue-50 border-l-4 border-primary rounded-r-lg">
                <h4 className="font-semibold text-text-primary mb-3">Click a suggestion to use it:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {suggestedTitles.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTitle(suggestion);
                        setSuggestedTitles([]);
                      }}
                      className="w-full h-full text-left p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-primary focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200"
                    >
                      <p className="font-medium text-text-primary">{suggestion}</p>
                    </button>
                  ))}
                </div>
                <div className="text-center mt-4">
                    <button onClick={() => setSuggestedTitles([])} className="text-sm text-gray-500 hover:text-gray-700">Clear suggestions</button>
                </div>
              </div>
            )}
        </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mt-6 flex items-center gap-3">
              <Icon type="error" className="w-6 h-6"/>
              <div>
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-4">
              <Icon type="spinner" className="w-8 h-8 text-primary"/>
              <div>
                <p className="font-semibold text-primary">Generation in Progress</p>
                <p className="text-text-secondary">{loadingMessage}</p>
              </div>
            </div>
          )}
        </div>

        {generatedBook && !isLoading && (
          <div className="mt-10 max-w-3xl mx-auto">
            <div className="bg-surface p-6 sm:p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold text-center mb-2">{generatedBook.title}</h3>
              <p className="text-text-secondary text-center mb-6">Your book has been successfully generated!</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                  <h4 className="text-lg font-semibold mb-3">Book Cover</h4>
                  {coverImage ? (
                    <div className="w-full">
                        <img src={coverImage} alt="Generated book cover" className="w-full h-auto rounded-md shadow-md object-cover" style={{aspectRatio: '3/4'}} />
                        <button
                          onClick={handleDownloadCover}
                          className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-hover transition-colors duration-300"
                        >
                          <Icon type="download" className="w-5 h-5"/>
                          <span>Download Cover</span>
                        </button>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-100 rounded-md flex items-center justify-center" style={{aspectRatio: '3/4'}}>
                      <button onClick={handleGenerateCover} disabled={isCoverLoading} className="flex items-center gap-2 bg-secondary text-primary font-bold py-2 px-4 rounded-md hover:bg-secondary-hover transition-colors duration-300 disabled:bg-gray-300">
                        {isCoverLoading ? <Icon type="spinner" className="w-5 h-5"/> : <Icon type="image" className="w-5 h-5"/>}
                        <span>{isCoverLoading ? 'Generating...' : 'Generate Cover'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 flex flex-col justify-center">
                   <h4 className="text-lg font-semibold mb-3">Download Book</h4>
                   <p className="text-text-secondary mb-4">Get your KDP-formatted book ready for publishing.</p>
                   
                   <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                       <label htmlFor="font-size-select" className="block text-sm font-medium text-text-secondary mb-1">Font Size</label>
                       <select
                         id="font-size-select"
                         value={fontSize}
                         onChange={(e) => setFontSize(Number(e.target.value))}
                         className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
                       >
                         <option value={10}>10 pt</option>
                         <option value={11}>11 pt</option>
                         <option value={12}>12 pt</option>
                         <option value={13}>13 pt</option>
                         <option value={14}>14 pt</option>
                       </select>
                     </div>
                     <div>
                       <label htmlFor="line-spacing-select" className="block text-sm font-medium text-text-secondary mb-1">Line Spacing</label>
                       <select
                         id="line-spacing-select"
                         value={lineSpacing}
                         onChange={(e) => setLineSpacing(Number(e.target.value))}
                         className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
                       >
                         <option value={1.15}>1.15</option>
                         <option value={1.5}>1.5</option>
                       </select>
                     </div>
                   </div>

                   <button
                    onClick={() => createAndDownloadDocx(generatedBook, { fontSize, lineSpacing })}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 transition-colors duration-300"
                  >
                    <Icon type="download" className="w-5 h-5"/>
                    <span>Download KDP File (.docx)</span>
                  </button>
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-2">Book Preview</h4>
                     <div className="h-64 overflow-y-auto p-3 bg-gray-50 border rounded-md text-sm text-text-secondary">
                        <p className="font-bold">Synopsis</p>
                        <p className="italic mb-4">{generatedBook.synopsis}</p>
                        <p className="font-bold">{generatedBook.introduction.title}</p>
                        <p className="line-clamp-3 mb-2">{generatedBook.introduction.content}</p>
                        {generatedBook.chapters.map((chap, i) => (
                           <p key={i} className="font-semibold text-xs opacity-75">{i+1}. {chap.title}</p>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;