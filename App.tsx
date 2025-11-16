import React, { useState, useCallback } from 'react';
import type { Book, Chapter, GenerationConfig } from './types';
import { generateBookOutline, generateChapterContent, generateCoverImage, generateAlternativeTitles, generateAuthorBio } from './services/geminiService';
import { createAndDownloadDocx } from './services/docxService';
import Icon from './components/Icon';
import { translations, LanguageKey, TranslationKey } from './translations';

type AuthorBioOption = 'manual' | 'auto';

const InputField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
  children?: React.ReactNode;
}> = ({ id, label, value, onChange, placeholder, disabled = false }) => (
  <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <input id={id} type="text" value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white disabled:bg-gray-100" />
  </div>
);

const SelectField: React.FC<{
  id: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ id, label, value, onChange, children, disabled = false }) => (
  <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <select id={id} value={value} onChange={onChange} disabled={disabled} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white appearance-none disabled:bg-gray-100">
          {children}
      </select>
  </div>
);

const TextAreaField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  rows?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}> = ({ id, label, value, onChange, placeholder, rows = 3, disabled = false }) => (
  <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} disabled={disabled} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white disabled:bg-gray-100" />
  </div>
);


const App: React.FC = () => {
  // UI Language
  const [uiLanguage, setUiLanguage] = useState<LanguageKey>('en');
  const t = useCallback((key: TranslationKey): string => {
    return translations[uiLanguage][key] || translations['en'][key];
  }, [uiLanguage]);

  // Main Information
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [category, setCategory] = useState<string>('Self-Help');

  // Book Configuration
  const [genre, setGenre] = useState<'fiction' | 'non-fiction'>('non-fiction');
  const [wordCount, setWordCount] = useState<string>('15,000 - 20,000 words');
  const [tone, setTone] = useState<string>('Motivational');
  const [targetAudience, setTargetAudience] = useState<string>('Entrepreneurs');
  const [language, setLanguage] = useState<string>('English');

  // Optional Content
  const [dedication, setDedication] = useState<string>('');
  const [acknowledgements, setAcknowledgements] = useState<string>('');
  const [authorBioOption, setAuthorBioOption] = useState<AuthorBioOption>('manual');
  const [authorBio, setAuthorBio] = useState<string>('');

  // App State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [generatedBook, setGeneratedBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Title Suggestions
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  
  // Cover Generation
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState<boolean>(false);
  const [coverFeedback, setCoverFeedback] = useState<string>('');

  // KDP Formatting
  const [fontFamily, setFontFamily] = useState<string>('Garamond');
  const [fontSize, setFontSize] = useState<number>(12);
  const [lineSpacing, setLineSpacing] = useState<number>(1.15);


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
    if (!title.trim() || !authorName.trim()) {
      setError(t('formError'));
      return;
    }

    setIsLoading(true);
    setGeneratedBook(null);
    setCoverImage(null);
    setError(null);
    setSuggestedTitles([]);

    try {
      let finalAuthorBio = authorBio;
      if (authorBioOption === 'auto') {
        setLoadingMessage('Step 1/4: Generating author bio...');
        finalAuthorBio = await generateAuthorBio(authorName, title, category, language);
        setAuthorBio(finalAuthorBio);
      }

      const generationConfig: GenerationConfig = {
        title, subtitle, authorName, category, genre, wordCount, tone, targetAudience, language
      };

      setLoadingMessage('Step 2/4: Generating book outline...');
      const outline = await generateBookOutline(generationConfig);
      
      setLoadingMessage(`Step 3/4: Generating content for ${outline.chapterTitles.length + 2} sections... (this may take a few minutes)`);
      
      const contentPromises: Promise<Chapter>[] = [
        generateChapterContent(generationConfig, outline.introductionTitle, outline.synopsis).then(content => ({ title: outline.introductionTitle, content })),
        ...outline.chapterTitles.map(chapterTitle => 
          generateChapterContent(generationConfig, chapterTitle, outline.synopsis).then(content => ({ title: chapterTitle, content }))
        ),
        generateChapterContent(generationConfig, outline.conclusionTitle, outline.synopsis).then(content => ({ title: outline.conclusionTitle, content })),
      ];
      
      const allContent = await Promise.all(contentPromises);
      
      setLoadingMessage('Step 4/4: Assembling your book...');

      const book: Book = {
        title,
        subtitle,
        authorName,
        copyright: `Copyright © ${new Date().getFullYear()} ${authorName}. All rights reserved.`,
        dedication,
        acknowledgements,
        authorBio: finalAuthorBio,
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
  }, [title, subtitle, authorName, category, genre, wordCount, tone, targetAudience, language, dedication, acknowledgements, authorBio, authorBioOption, t]);

  const handleGenerateCover = useCallback(async (feedback?: string) => {
    if (!generatedBook) return;
    setIsCoverLoading(true);
    setError(null);
    try {
      const imageBase64 = await generateCoverImage(generatedBook.title, generatedBook.synopsis, feedback);
      setCoverImage(`data:image/jpeg;base64,${imageBase64}`);
      setCoverFeedback('');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{t('headerTitle')}</h1>
          <div className="ml-auto">
            <select 
              value={uiLanguage} 
              onChange={(e) => setUiLanguage(e.target.value as LanguageKey)} 
              className="bg-primary-hover text-white rounded-md p-2 border-2 border-transparent focus:border-white focus:ring-0"
              aria-label="Change site language"
            >
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-surface p-6 sm:p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-2">{t('startYourMasterpiece')}</h2>
          <p className="text-text-secondary mb-6">{t('fillDetailsPrompt')}</p>
          
          <div className="space-y-6">
            <details className="space-y-4 group" open>
                <summary className="cursor-pointer font-semibold text-lg text-primary list-none group-open:mb-4">{t('mainInformation')}</summary>
                <InputField id="book-title" label={t('bookTitle')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('bookTitlePlaceholder')} disabled={isLoading} />
                 {suggestedTitles.length === 0 && !isSuggesting && (
                    <div className="text-left">
                        <button onClick={handleSuggestTitles} disabled={isLoading || !title.trim()} className="inline-flex items-center gap-2 py-1 px-3 text-sm bg-secondary text-primary font-bold rounded-md hover:bg-secondary-hover transition-colors duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed">
                            <Icon type="sparkles" className="w-4 h-4"/>
                            <span>{t('suggestTitles')}</span>
                        </button>
                    </div>
                )}
                 {isSuggesting && <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-2"><Icon type="spinner" className="w-5 h-5 text-primary"/><p className="font-semibold text-primary text-sm">{t('thinkingOfTitles')}</p></div>}
                 {suggestedTitles.length > 0 && !isSuggesting && (
                    <div className="p-3 bg-blue-50 border-l-4 border-primary rounded-r-lg">
                        <h4 className="font-semibold text-text-primary mb-2 text-sm">{t('clickToUseSuggestion')}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suggestedTitles.map((suggestion, index) => (
                            <button key={index} onClick={() => { setTitle(suggestion); setSuggestedTitles([]); }} className="w-full h-full text-left p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-primary focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200">
                                <p className="font-medium text-text-primary text-sm">{suggestion}</p>
                            </button>
                        ))}
                        </div>
                         <div className="text-center mt-3"><button onClick={() => setSuggestedTitles([])} className="text-xs text-gray-500 hover:text-gray-700">{t('clear')}</button></div>
                    </div>
                )}
                <InputField id="book-subtitle" label={t('subtitle')} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={t('subtitlePlaceholder')} disabled={isLoading} />
                <InputField id="author-name" label={t('authorName')} value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder={t('authorNamePlaceholder')} disabled={isLoading} />
                <InputField id="category" label={t('category')} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('categoryPlaceholder')} disabled={isLoading} />
            </details>

             <details className="space-y-4 group" open>
                <summary className="cursor-pointer font-semibold text-lg text-primary list-none group-open:mb-4">{t('bookConfiguration')}</summary>
                <div>
                     <label className="block text-sm font-medium text-text-secondary mb-2">{t('genre')}</label>
                     <div className="flex gap-4">
                         <label className="flex items-center gap-2"><input type="radio" value="non-fiction" checked={genre === 'non-fiction'} onChange={(e) => setGenre(e.target.value as any)} name="genre" className="focus:ring-primary" disabled={isLoading}/> {t('nonFiction')}</label>
                         <label className="flex items-center gap-2"><input type="radio" value="fiction" checked={genre === 'fiction'} onChange={(e) => setGenre(e.target.value as any)} name="genre" className="focus:ring-primary" disabled={isLoading}/> {t('fiction')}</label>
                     </div>
                </div>
                <SelectField id="word-count" label={t('wordCount')} value={wordCount} onChange={(e) => setWordCount(e.target.value)} disabled={isLoading}>
                    <option>5,000 - 10,000 words</option>
                    <option>15,000 - 20,000 words</option>
                    <option>25,000 - 30,000 words</option>
                    <option>40,000 - 50,000 words</option>
                </SelectField>
                <InputField id="tone" label={t('tone')} value={tone} onChange={(e) => setTone(e.target.value)} placeholder={t('tonePlaceholder')} disabled={isLoading} />
                <InputField id="target-audience" label={t('targetAudience')} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder={t('targetAudiencePlaceholder')} disabled={isLoading} />
                 <SelectField id="language-select" label={t('generationLanguage')} value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isLoading}>
                    <option value="English">English</option><option value="Portuguese">Portuguese</option><option value="Spanish">Spanish</option><option value="French">French</option><option value="German">German</option><option value="Italian">Italian</option>
                </SelectField>
            </details>

             <details className="space-y-4 group">
                <summary className="cursor-pointer font-semibold text-lg text-primary list-none group-open:mb-4">{t('optionalContent')}</summary>
                <TextAreaField id="dedication" label={t('dedication')} value={dedication} onChange={(e) => setDedication(e.target.value)} placeholder={t('dedicationPlaceholder')} disabled={isLoading} />
                <TextAreaField id="acknowledgements" label={t('acknowledgements')} value={acknowledgements} onChange={(e) => setAcknowledgements(e.target.value)} placeholder={t('acknowledgementsPlaceholder')} disabled={isLoading} />
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">{t('authorBio')}</label>
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2"><input type="radio" value="manual" checked={authorBioOption === 'manual'} onChange={(e) => setAuthorBioOption(e.target.value as any)} name="bio-option" className="focus:ring-primary" disabled={isLoading}/> {t('manual')}</label>
                        <label className="flex items-center gap-2"><input type="radio" value="auto" checked={authorBioOption === 'auto'} onChange={(e) => setAuthorBioOption(e.target.value as any)} name="bio-option" className="focus:ring-primary" disabled={isLoading}/> {t('generateWithAI')}</label>
                    </div>
                    {authorBioOption === 'manual' && (
                        <TextAreaField id="author-bio" label="" value={authorBio} onChange={(e) => setAuthorBio(e.target.value)} placeholder={t('authorBioPlaceholder')} disabled={isLoading} />
                    )}
                </div>
            </details>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={handleGenerateBook}
              disabled={isLoading || isSuggesting || !title || !authorName}
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-hover transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              <Icon type="book" className="w-6 h-6"/>
              <span>{isLoading ? t('weavingYourBook') : t('generateBook')}</span>
            </button>
          </div>
        </div>

          {error && (
            <div className="max-w-3xl mx-auto bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mt-6 flex items-center gap-3">
              <Icon type="error" className="w-6 h-6"/>
              <div><p className="font-bold">{t('errorTitle')}</p><p>{error}</p></div>
            </div>
          )}

          {isLoading && (
            <div className="max-w-3xl mx-auto mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-4">
              <Icon type="spinner" className="w-8 h-8 text-primary"/>
              <div><p className="font-semibold text-primary">{t('generationInProgress')}</p><p className="text-text-secondary">{loadingMessage}</p></div>
            </div>
          )}
        
        {generatedBook && !isLoading && (
          <div className="mt-10 max-w-3xl mx-auto">
            <div className="bg-surface p-6 sm:p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold text-center mb-2">{generatedBook.title}</h3>
              <p className="text-text-secondary text-center mb-2 font-semibold">{t('bookGeneratedSuccess')}</p>
              <p className="text-text-secondary text-center mb-6">{t('bookGeneratedPrompt')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                  <h4 className="text-lg font-semibold mb-3">{t('bookCover')}</h4>
                  {coverImage ? (
                    <div className="w-full">
                        <img src={coverImage} alt="Generated book cover" className="w-full h-auto rounded-md shadow-md object-cover" style={{aspectRatio: '3/4'}} />
                        <button onClick={handleDownloadCover} className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-hover transition-colors duration-300">
                          <Icon type="download" className="w-5 h-5"/><span>{t('downloadCover')}</span>
                        </button>
                        <div className="mt-4 pt-4 border-t border-gray-200 text-left">
                            <label htmlFor="cover-feedback" className="block text-sm font-medium text-text-secondary mb-2">{t('correctCoverPrompt')}</label>
                            <textarea id="cover-feedback" rows={3} value={coverFeedback} onChange={(e) => setCoverFeedback(e.target.value)} placeholder={t('correctCoverPlaceholder')} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition bg-white" disabled={isCoverLoading}/>
                            <button onClick={() => handleGenerateCover(coverFeedback)} disabled={isCoverLoading || !coverFeedback.trim()} className="mt-2 w-full flex items-center justify-center gap-2 bg-secondary text-primary font-bold py-2 px-4 rounded-md hover:bg-secondary-hover transition-colors duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                {isCoverLoading ? <Icon type="spinner" className="w-5 h-5"/> : <Icon type="adjustments" className="w-5 h-5"/>}
                                <span>{isCoverLoading ? t('regenerating') : t('correctCover')}</span>
                            </button>
                        </div>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-100 rounded-md flex items-center justify-center" style={{aspectRatio: '3/4'}}>
                      <button onClick={() => handleGenerateCover()} disabled={isCoverLoading} className="flex items-center gap-2 bg-secondary text-primary font-bold py-2 px-4 rounded-md hover:bg-secondary-hover transition-colors duration-300 disabled:bg-gray-300">
                        {isCoverLoading ? <Icon type="spinner" className="w-5 h-5"/> : <Icon type="image" className="w-5 h-5"/>}
                        <span>{isCoverLoading ? t('generating') : t('generateCover')}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 flex flex-col justify-center">
                   <h4 className="text-lg font-semibold mb-3">{t('downloadBook')}</h4>
                   <p className="text-text-secondary mb-4">{t('downloadBookPrompt')}</p>
                   <div className="grid grid-cols-1 gap-4 mb-4">
                      <SelectField id="font-family-select" label={t('fontFamily')} value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                         <option value="Garamond">Garamond</option>
                         <option value="Times New Roman">Times New Roman</option>
                      </SelectField>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mb-4">
                     <SelectField id="font-size-select" label={t('fontSize')} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
                       <option value={10}>10 pt</option><option value={11}>11 pt</option><option value={12}>12 pt</option><option value={13}>13 pt</option><option value={14}>14 pt</option>
                     </SelectField>
                     <SelectField id="line-spacing-select" label={t('lineSpacing')} value={lineSpacing} onChange={(e) => setLineSpacing(Number(e.target.value))}>
                        <option value={1.15}>1.15</option><option value={1.5}>1.5</option>
                     </SelectField>
                   </div>
                   <button onClick={() => createAndDownloadDocx(generatedBook, { fontSize, lineSpacing, fontFamily })} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 transition-colors duration-300">
                    <Icon type="download" className="w-5 h-5"/><span>{t('downloadKDPFile')}</span>
                   </button>
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-2">{t('bookPreview')}</h4>
                     <div className="h-64 overflow-y-auto p-3 bg-gray-50 border rounded-md text-sm text-text-secondary">
                        <p className="font-bold">{t('synopsis')}</p><p className="italic mb-4">{generatedBook.synopsis}</p>
                        <p className="font-bold">{generatedBook.introduction.title}</p><p className="line-clamp-3 mb-2">{generatedBook.introduction.content}</p>
                        {generatedBook.chapters.map((chap, i) => (<p key={i} className="font-semibold text-xs opacity-75">{i+1}. {chap.title}</p>))}
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