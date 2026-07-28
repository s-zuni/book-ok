import { Capacitor } from '@capacitor/core';

/**
 * Supabase Storage Image Transformation 기반 이미지 최적화 유틸리티.
 *
 * Capacitor 빌드에서는 Next.js Image Optimization이 비활성화되므로(unoptimized: true),
 * 외부 API(예: Aladin)의 고화질 이미지가 리사이징 없이 그대로 모바일에 로드됩니다.
 *
 * 이 유틸리티는 Supabase Storage의 Image Transformations(render/image) 엔드포인트를
 * 이미지 리사이징 프록시로 활용하여, 모바일 환경에서 적절한 사이즈의 이미지를 제공합니다.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://holaqlorkluptvrcfwtu.supabase.co';

/** 사전 정의된 이미지 사이즈 프리셋 (width 기준) */
export type ImageSizePreset = 'thumbnail' | 'card' | 'detail' | 'full';

const SIZE_PRESETS: Record<ImageSizePreset, { width: number; height: number }> = {
  /** 모바일 가로 스크롤 카드 (128×170) */
  thumbnail: { width: 128, height: 170 },
  /** 그리드 카드 (256×340) */
  card: { width: 256, height: 340 },
  /** 상세 페이지 (384×512) */
  detail: { width: 384, height: 512 },
  /** 원본 사이즈 유지 (리사이징 안 함) */
  full: { width: 0, height: 0 },
};

/**
 * 이미지 URL을 모바일 최적 사이즈로 변환합니다.
 *
 * - **Capacitor (모바일)**: Supabase Storage의 `/render/image/public` 엔드포인트로
 *   리사이징 프록시하여 작은 이미지를 반환합니다.
 * - **Web (Vercel)**: Next.js Image Optimization이 활성화되어 있으므로 원본 URL을 그대로 반환합니다.
 *
 * @param src - 원본 이미지 URL (외부 API 이미지 포함)
 * @param preset - 사이즈 프리셋 (기본값: 'card')
 * @returns 최적화된 이미지 URL
 */
export function getOptimizedImageUrl(
  src: string | undefined | null,
  preset: ImageSizePreset = 'card'
): string {
  // fallback for empty/invalid src
  if (!src || !src.startsWith('http')) {
    return '/file.svg';
  }

  // Web 환경에서는 Next.js Image Optimization이 처리하므로 원본 반환
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    return src;
  }

  // SSR 환경에서도 원본 반환
  if (typeof window === 'undefined') {
    return src;
  }

  // 'full' 프리셋은 리사이징하지 않음
  if (preset === 'full') {
    return src;
  }

  const { width, height } = SIZE_PRESETS[preset];

  // Supabase Storage Image Transformations를 리사이징 프록시로 활용
  // /storage/v1/render/image/public 엔드포인트는 외부 URL도 리사이징 가능
  // 쿼리파라미터: width, height, resize=cover, quality
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    resize: 'cover',
    quality: '75',
  });

  return `${SUPABASE_URL}/storage/v1/render/image/public?${params.toString()}&url=${encodeURIComponent(src)}`;
}

/**
 * 커스텀 width/height로 이미지를 최적화합니다.
 *
 * @param src - 원본 이미지 URL
 * @param width - 리사이즈 너비 (px)
 * @param height - 리사이즈 높이 (px)
 * @param quality - 이미지 품질 (1-100, 기본값: 75)
 * @returns 최적화된 이미지 URL
 */
export function getResizedImageUrl(
  src: string | undefined | null,
  width: number,
  height: number,
  quality: number = 75
): string {
  if (!src || !src.startsWith('http')) {
    return '/file.svg';
  }

  // Web/SSR 환경에서는 원본 반환
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return src;
  }

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    resize: 'cover',
    quality: String(quality),
  });

  return `${SUPABASE_URL}/storage/v1/render/image/public?${params.toString()}&url=${encodeURIComponent(src)}`;
}
