import { NewsArticle } from '@/types/news';

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="border border-black/[.08] dark:border-white/[.145] rounded-lg p-6 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition-colors">
      <h2 className="text-xl font-semibold mb-3">{article.title}</h2>
      <p className="mb-4 text-gray-600 dark:text-gray-300">{article.content}</p>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 dark:text-gray-400">{article.source}</span>
        <a 
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Read more →
        </a>
      </div>
    </article>
  );
} 