'use client';

import Image, { ImageProps } from 'next/image';
import { getOptimizedImageUrl, ImageSizePreset } from '@shared/lib/image-utils';

/**
 * Next.js Image를 래핑하여, Capacitor 모바일 빌드에서
 * Supabase Storage Image Transformations으로 리사이징된 URL을 자동 적용하는 컴포넌트.
 *
 * Web 환경에서는 Next.js Image Optimization이 활성화되어 있으므로 원본 URL을 그대로 사용합니다.
 *
 * @example
 * // 기존: <Image src={book.imgsrc} ... />
 * // 변경: <OptimizedImage src={book.imgsrc} sizePreset="card" ... />
 */
interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string | undefined | null;
  /** 사이즈 프리셋. 기본값: 'card' */
  sizePreset?: ImageSizePreset;
  /** fallback 이미지 경로. 기본값: '/file.svg' */
  fallbackSrc?: string;
}

export default function OptimizedImage({
  src,
  sizePreset = 'card',
  fallbackSrc = '/file.svg',
  alt,
  ...rest
}: OptimizedImageProps) {
  const optimizedSrc = getOptimizedImageUrl(src, sizePreset);
  const finalSrc = optimizedSrc || fallbackSrc;

  return (
    <Image
      src={finalSrc}
      alt={alt}
      {...rest}
    />
  );
}
