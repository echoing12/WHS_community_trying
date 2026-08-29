'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, Camera, Heart, PencilLine } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import PostCard from '@/components/PostCard';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fetchProfile, updateBio, uploadAvatar } from '@/lib/api';
import { useT } from '@/hooks/useLang';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { LibraryNode, Profile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioError, setBioError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProfile();
      setProfile(data);
      setAvatar(data.user.avatar);
      setBio(data.user.bio);
    } catch {
      setProfile(null);
      setError(t('个人资料加载失败，请检查网络后重试'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 头像上传：真实 API POST /api/accounts/self/avatar（application/octet-stream）
  // 前端校验：仅图片类型、≤5MB（超限提前拦截）
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('仅支持图片格式（JPG / PNG / GIF 等）'));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError(t('头像图片不能超过 5MB，请压缩后重试'));
      return;
    }
    try {
      const avatarUrl = await uploadAvatar(file);
      setAvatar(avatarUrl);
      setProfile((p) => (p ? { ...p, user: { ...p.user, avatar: avatarUrl } } : p));
    } catch {
      setError(t('头像上传失败，请重试'));
    }
  };

  // 保存简介：真实 API PATCH /api/accounts/{id}（StoryDen 当前版本可能拒绝浏览器会话，内联提示）
  const saveBio = async () => {
    if (!profile?.user.id) {
      setBioError(t('无法获取账号信息，请重新登录后重试'));
      return;
    }
    try {
      await updateBio(bio.trim(), profile.user.id);
      setProfile((p) => (p ? { ...p, user: { ...p.user, bio: bio.trim() } } : p));
      setBioError('');
      setEditingBio(false);
    } catch (err) {
      setBioError(t('保存失败：暂无权限修改个人简介（StoryDen 需管理员权限），请稍后再试'));
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-ink/50">{t('加载中…')}</p>;
  }

  if (!profile) {
    return (
      <div className="hand-card p-10 text-center">
        <p className="font-medium">{error || t('加载个人资料失败')}</p>
        <Button className="mt-4" onClick={() => router.push('/auth/login')}>
          {t('去登录')}
        </Button>
      </div>
    );
  }

  // 基于Storyden官方规格: 个人中心需要登录，由 AuthGuard 客户端校验（middleware 服务端首道拦截）
  return (
    <AuthGuard>
    <div className="space-y-6">
      {/* 个人信息卡片 */}
      <section className="hand-card p-6 lg:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* 头像（可上传） */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={t('点击更换头像')}
            className="group relative"
          >
            <Avatar name={profile.user.name} src={avatar} size="lg" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-butter transition-transform group-hover:scale-110">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="flex-1 text-center sm:text-left">
            <h1 className="hand-title text-2xl text-ink">{profile.user.name}</h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink/60">
              <Calendar className="h-4 w-4" />
              {t('注册于 {date}', { date: profile.user.joined_at ? formatDate(profile.user.joined_at) : '—' })}
            </p>

            {/* 个人简介（可编辑） */}
            <div className="mt-4">
              {editingBio ? (
                <div className="space-y-2">
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                  {bioError && <p className="text-sm font-medium text-red-500">{bioError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => setEditingBio(false)}>
                      {t('取消')}
                    </Button>
                    <Button size="sm" variant="solid" onClick={saveBio}>
                      {t('保存')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm leading-relaxed text-ink/80">
                    {bio || t('TA 还没有填写个人简介')}
                  </p>
                  <button
                    onClick={() => {
                      setBioError('');
                      setEditingBio(true);
                    }}
                    title={t('编辑简介')}
                    className="rounded-lg p-2 transition-colors hover:bg-ink/5"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 发布的帖子（真实 API：GET /api/threads?author={handle}） */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">
          {t('发布的帖子')}{' '}
          <span className="text-sm text-ink/50">{t('（{n}）', { n: profile.user.posts.length })}</span>
        </h2>
        {profile.user.posts.length === 0 ? (
          <div className="hand-card p-10 text-center">
            <p className="font-medium">{t('还没有发布过帖子')}</p>
            <p className="mt-2 text-sm text-ink/60">{t('迈出第一步，分享你的故事吧！')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {profile.user.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* 我的知识库贡献（真实 API：GET /api/nodes?author={handle}） */}
      <section className="space-y-4">
        <h2 className="hand-title text-xl text-ink">
          {t('我的知识库贡献')}{' '}
          <span className="text-sm text-ink/50">
            {t('（{n}）', { n: profile.user.library_pages.length })}
          </span>
        </h2>
        {profile.user.library_pages.length === 0 ? (
          <div className="hand-card p-10 text-center">
            <p className="font-medium">{t('还没有写过知识库页面')}</p>
            <p className="mt-2 text-sm text-ink/60">{t('把你的经验沉淀成长期有用的知识吧！')}</p>
            <Link href="/library/create" className="mt-4 inline-block">
              <Button size="sm">{t('去写知识库')}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.user.library_pages.map((page) => (
              <LibraryPageCard key={page.id} page={page} />
            ))}
          </div>
        )}
      </section>

      {/* 我的草稿（真实 API：GET /api/nodes/drafts；StoryDen 仅管理员可直接发布，
          普通成员的知识库页面存为草稿，可继续编辑） */}
      {!!profile.user.drafts?.length && (
        <section className="space-y-4">
          <h2 className="hand-title text-xl text-ink">
            {t('我的草稿')}{' '}
            <span className="text-sm text-ink/50">{t('（{n}）', { n: profile.user.drafts.length })}</span>
          </h2>
          <div className="space-y-3">
            {profile.user.drafts.map((page) => (
              <DraftCard key={page.id} page={page} />
            ))}
          </div>
        </section>
      )}

      {/* 我的收藏（真实 API：Collections 中 kind=post / kind=node） */}
      <section className="space-y-4">
        <h2 className="hand-title flex items-center gap-2 text-xl text-ink">
          <Heart className="h-5 w-5 fill-ink" />
          {t('我的收藏')}
          <span className="text-sm text-ink/50">
            {t('（{n}）', {
              n: profile.user.collections.posts.length + profile.user.collections.library_pages.length,
            })}
          </span>
        </h2>

        {profile.user.collections.posts.length === 0 &&
        profile.user.collections.library_pages.length === 0 ? (
          <div className="hand-card p-10 text-center">
            <p className="font-medium">{t('还没有收藏任何内容')}</p>
            <p className="mt-2 text-sm text-ink/60">
              {t('看到有用的帖子或知识库页面，点一下「收藏」就能在这里找到。')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 收藏的帖子 */}
            {profile.user.collections.posts.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-ink/60">
                  {t('帖子')}{' '}
                  <span className="text-ink/40">
                    {t('（{n}）', { n: profile.user.collections.posts.length })}
                  </span>
                </p>
                {profile.user.collections.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {/* 收藏的知识库页面 */}
            {profile.user.collections.library_pages.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-ink/60">
                  {t('知识库页面')}{' '}
                  <span className="text-ink/40">
                    {t('（{n}）', { n: profile.user.collections.library_pages.length })}
                  </span>
                </p>
                {profile.user.collections.library_pages.map((page) => (
                  <LibraryPageCard key={page.id} page={page} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
    </AuthGuard>
  );
}

// 草稿卡片（待审核 / 未发布的知识库页面，可继续编辑）
function DraftCard({ page }: { page: LibraryNode }) {
  const t = useT();
  return (
    <article className="hand-card flex items-center gap-4 p-4">
      <BookOpen className="h-5 w-5 shrink-0 text-ink/60" />
      <div className="min-w-0 flex-1">
        <h3 className="hand-title truncate text-lg text-ink">{page.title}</h3>
        <p className="mt-1 text-xs text-ink/50">{t('草稿 · 等待管理员审核后公开（仅自己可见）')}</p>
      </div>
      <Link href={`/library/${page.slug}/edit`}>
        <Button size="sm">{t('继续编辑')}</Button>
      </Link>
    </article>
  );
}

// 知识库页面卡片（我的贡献 / 我的收藏共用）
function LibraryPageCard({ page }: { page: LibraryNode }) {
  const t = useT();
  return (
    <Link href={`/library/${page.slug}`} className="group block">
      <article className="hand-card p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-ink/60" />
          <h3 className="hand-title min-w-0 flex-1 truncate text-lg text-ink group-hover:underline">
            {page.title}
          </h3>
          <Badge variant="butter">{t('知识库')}</Badge>
        </div>
        {page.summary && <p className="mt-2 line-clamp-2 text-sm text-ink/60">{page.summary}</p>}
        <div className="mt-3 flex items-center gap-3 text-sm text-ink/70">
          <Avatar name={page.author.name} src={page.author.avatar} size="sm" />
          <span className="font-medium">{page.author.name}</span>
          <span className="text-ink/40">·</span>
          <span>{formatRelativeTime(page.created_at)}</span>
        </div>
      </article>
    </Link>
  );
}
