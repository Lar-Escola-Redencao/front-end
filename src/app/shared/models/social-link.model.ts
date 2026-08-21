export type SocialPlatform =
  'instagram' | 'facebook' | 'whatsapp' | 'youtube' | 'tiktok' | 'linkedin' | 'x' | 'outro';

export interface SocialLink {
  id: number;
  platform: SocialPlatform;
  label: string;
  url: string;
  active: boolean;
}

export type SocialLinkInput = Omit<SocialLink, 'id'>;

export const SOCIAL_PLATFORM_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'outro', label: 'Outro' },
];
