// Next.js components and utilities
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { documentToPlainTextString } from '@contentful/rich-text-plain-text-renderer';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import MuxVideo from '@mux/mux-video-react';
import { ErrorBoundary } from '@/components/global/ErrorBoundary';
import { Prose } from '@/components/global/matic-ds';

// API functions
import { getAllArticles, getArticle } from '@/lib/api';

import { Container, Article, Box } from '@/components/global/matic-ds';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

// Types
import { type Article as ArticleProps } from '@/types';

import { PLACEHOLDER_IMAGE } from '@/constants/images';

/**
 * Props interface for the article page
 * @property params.slug - URL slug for the article
 */
interface Props {
  params: { slug: string };
}

/**
 * Static page generation configuration
 * Generates static pages for all articles at build time
 * This improves performance and SEO
 *
 * @returns Array of possible slug values for static generation
 */
export async function generateStaticParams() {
  const { items: articles } = await getAllArticles(3);
  return articles.map((article: ArticleProps) => ({
    slug: article.slug
  }));
}

/**
 * Dynamic metadata generation for SEO
 * Generates title and description based on article content
 *
 * @param params - Contains the article slug
 * @returns Metadata object for the page
 */
export async function generateMetadata({
  params
}: {
  params: Promise<Props['params']>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticle(resolvedParams.slug);

  if (!article) {
    return {
      title: 'Article Not Found'
    };
  }

  return {
    title: article.title,
    description: `Read about ${article.title}`,
    openGraph: {
      title: article.title,
      description:
        documentToPlainTextString(article.description.json) || `Read about ${article.title}`,
      images: article.featuredImage?.url
    }
  };
}

/**
 * Article page component
 * Displays a single article with its content and metadata
 * Features:
 * - Responsive image handling
 * - Navigation back to home
 * - Article metadata display
 * - Fallback for missing images
 *
 * @param params - Contains the article slug from the URL
 */
export default async function ArticlePage({ params }: { params: Promise<Props['params']> }) {
  const resolvedParams = await params;
  const article = await getArticle(resolvedParams.slug);

  // Redirect to 404 page if article not found
  if (!article) {
    notFound();
  }

  const videoUrl = article.video?.playbackId
    ? `https://stream.mux.com/${article.video.playbackId}.m3u8`
    : null;

  return (
    <Container>
      <ErrorBoundary>
        <Box cols={1} gap={4}>
          <Article className="space-y-8">
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
              <BreadcrumbList className="ml-0">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-blue-600 hover:underline">
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/articles" className="text-blue-600 hover:underline">
                    Articles
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{article.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1>{article.title}</h1>

            {/* Article metadata */}
            <div>
              <div>ID: {article.sys.id}</div>
              <div>Slug: {article.slug}</div>
            </div>

            {/* Mux video player */}
            {videoUrl ? (
              <MuxVideo
                src={videoUrl}
                type="hls"
                metadata={{
                  video_id: `video-id-${article.sys.id}`,
                  video_title: article.title
                }}
                controls
              />
            ) : (
              // Fallback for when there's no video
              <Image
                src={article.featuredImage?.url ?? PLACEHOLDER_IMAGE}
                alt={`Cover image for ${article.title}`}
                height={263}
                width={350}
                className="aspect-video w-full rounded-md object-cover"
              />
            )}

            <Prose>{documentToReactComponents(article.description.json)}</Prose>
          </Article>
        </Box>
      </ErrorBoundary>
    </Container>
  );
}
