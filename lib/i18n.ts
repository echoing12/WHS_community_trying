// ============ 轻量国际化（中 / 英） ============
// 设计：字典键 = 中文原文，t(key) 在英文模式下查表，缺失时回退中文原文。
// 这样中文模式零开销，且任何漏译不会破坏界面。
export type Lang = 'zh' | 'en';

export const STORAGE_KEY = 'whs-lang';

// 英文翻译表（键 = 中文原文；值 = 英文）
export const en: Record<string, string> = {
  // ===== 品牌 / 导航 =====
  '🌿 WHS 互助社区': '🌿 WHS Community',
  '🌿 菜单': '🌿 Menu',
  '首页': 'Home',
  '知识库': 'Library',
  '链接': 'Links',
  '用户': 'Members',
  '标签': 'Tags',
  '收藏夹': 'Collections',
  '个人中心': 'Profile',
  '管理': 'Admin',
  '发布': 'Post',
  '登录': 'Log in',
  '登录 / 注册': 'Log in / Sign up',
  '外观': 'Appearance',
  '导航': 'Navigate',

  // ===== 页脚 =====
  '本论坛仅供 WHS 患者交流，不构成医疗建议': 'This forum is for WHS families to share experiences. It is not medical advice.',
  '如遇紧急情况，请及时联系专业医生。请勿在本论坛发布个人敏感信息。':
    'In an emergency, contact a doctor immediately. Do not post personal sensitive information here.',
  '© {year} WHS 互助社区 · 由社区志愿者维护': '© {year} WHS Community · Maintained by volunteers',

  // ===== 通用 =====
  '加载中…': 'Loading…',
  '重试': 'Retry',
  '返回': 'Back',
  '取消': 'Cancel',
  '保存': 'Save',
  '新建': 'Create',
  '编辑': 'Edit',
  '删除': 'Delete',
  '发送': 'Send',
  '提交': 'Submit',
  '发布中…': 'Publishing…',
  '提交中…': 'Submitting…',
  '保存修改': 'Save changes',
  '全部': 'All',
  '登录后即可互动': 'Log in to interact',
  '登录后可互动，': 'Log in to interact, ',
  '去登录': 'Log in',
  '没有找到相关帖子': 'No posts found',
  '换个关键词试试，或者来发布第一帖吧！': 'Try another keyword, or be the first to post!',
  '去发布': 'Create a post',
  '帖子加载失败，请检查网络后重试': 'Failed to load posts. Check your network and try again.',
  '还没有任何标签': 'No tags yet',
  '发布内容时打上标签，方便大家按主题查找。': 'Tag your posts so others can find them by topic.',
  '还没有评论，来抢沙发吧～': 'No comments yet — be the first!',
  '请登录后参与讨论': 'Log in to join the discussion',
  '返回首页': 'Back to home',
  '页面不存在或已被删除': 'This page does not exist or has been removed.',
  '出了点问题': 'Something went wrong',
  '页面加载失败，请重试或返回首页': 'The page failed to load. Please retry or go home.',

  // ===== 首页 =====
  '🌿 欢迎回家，我们在一起': '🌿 Welcome home — we are here together',
  '分享经验、互相打气，这里属于每一位 WHS 患者的家庭。':
    'Share experiences and lift each other up. This community belongs to every WHS family.',
  '在这里，你不孤单': 'You are not alone',
  '搜索帖子标题…': 'Search post titles…',
  '发布新帖': 'New post',
  '加载更多': 'Load more',

  // ===== 帖子卡片 =====
  '置顶': 'Pinned',
  '已收藏': 'Saved',
  '未收藏': 'Not saved',
  '置顶帖': 'Pinned post',

  // ===== 时间 =====
  '刚刚': 'just now',
  '{n} 分钟前': '{n}m ago',
  '{n} 小时前': '{n}h ago',
  '{n} 天前': '{n}d ago',
  '{n} 个月前': '{n}mo ago',
  '{n} 年前': '{n}y ago',

  // ===== 登录 / 注册 =====
  '🌿 欢迎来到 WHS 互助社区': '🌿 Welcome to WHS Community',
  '这里没有陌生人，只有同路人': 'No strangers here — only fellow travelers.',
  '登录名': 'Username',
  '登录名或邮箱': 'Username or email',
  '密码': 'Password',
  '确认密码': 'Confirm password',
  '邀请码': 'Invitation code',
  '（可选）': '(optional)',
  ' *': ' *',
  '注册': 'Sign up',
  '仅小写字母、数字、_ 和 -（如 xiaoman_mama）': 'Lowercase letters, numbers, _ and - only (e.g. xiaoman_mama)',
  '你的登录名或邮箱': 'Your username or email',
  '请输入登录名或邮箱': 'Please enter your username or email',
  '至少 6 位字符': 'At least 6 characters',
  '请再次输入密码': 'Please confirm your password',
  '两次输入的密码不一致': 'Passwords do not match',
  '请输入邀请码': 'Please enter the invitation code',
  '管理员开启邀请制后，注册必须持有有效邀请码': 'Invitation required when the admin enables invite-only signup.',
  '登录中…': 'Logging in…',
  '注册中…': 'Signing up…',
  '登录失败，请检查账号密码后重试': 'Login failed. Check your credentials and try again.',
  '注册失败，请稍后重试': 'Signup failed. Please try again later.',

  // ===== 成员 =====
  '👥 成员列表': '👥 Members',
  '认识社区里的每一位伙伴，点击成员可以查看 TA 的主页。':
    'Meet everyone in the community — click a member to visit their profile.',
  '共 {n} 位成员': '{n} members',
  '上一页': 'Previous',
  '下一页': 'Next',
  '搜索成员昵称…': 'Search member names…',
  '没有找到匹配的成员': 'No matching members',
  '换个昵称关键词试试吧': 'Try a different name.',
  '成员列表加载失败，请检查网络后重试': 'Failed to load members. Check your network and try again.',
  '注册于 {date}': 'Joined {date}',
  '{n} 粉丝': '{n} followers',
  '粉丝': 'Followers',
  '关注': 'Following',
  '（{n}）': '({n})',
  '还没有粉丝': 'No followers yet',
  '还没有关注任何人': 'Not following anyone yet',
  '返回成员主页': 'Back to profile',
  '粉丝列表加载失败，请检查网络后重试': 'Failed to load followers. Check your network and try again.',
  '关注列表加载失败，请检查网络后重试': 'Failed to load following. Check your network and try again.',
  '登录后即可浏览社区成员信息': 'Log in to browse community members.',
  'TA 可能已经离开了社区': 'This member may have left the community.',
  '成员信息仅供社区内部交流使用，请勿在站外传播；本社区仅供 WHS 患者交流，不构成医疗建议':
    'Member information is for internal community use only. Please do not share it outside. This community is for WHS families and is not medical advice.',
  '简介': 'Bio',
  'TA 还没有填写简介': 'No bio yet',
  '关注中': 'Following',
  '已关注': 'Following',
  '关注 TA': 'Follow',

  // ===== 知识库 =====
  '📚 知识库': '📚 Library',
  '由家长共同整理的知识手册：确诊、康复、照护与心理支持。每一页都来自真实经验。':
    'A handbook compiled by parents: diagnosis, recovery, care and emotional support. Every page comes from real experience.',
  '写知识库页面': 'Write a library page',
  '📂 目录导航': '📂 Table of contents',
  '知识库加载失败，请检查网络后重试': 'Failed to load the library. Check your network and try again.',
  '知识库还是空的': 'The library is empty',
  '来写下第一篇知识库页面吧！': 'Write the first library page!',
  '{n} 页': '{n} pages',
  '知识库内容由家长互助整理，仅供参考，不构成医疗建议；请以主治医生的意见为准':
    'Library content is compiled by families for reference only. It is not medical advice; defer to your doctor.',
  '知识库页面已保存为草稿：StoryDen 仅管理员可直接发布，草稿等待管理员审核后公开（草稿期间仅自己可见）。':
    'Saved as a draft: only admins can publish directly. Drafts become public after admin review (visible only to you meanwhile).',
  '编辑知识库页面': 'Edit library page',
  '✍️ 写知识库页面': '✍️ Write a library page',
  '✍️ 编辑知识库页面': '✍️ Edit library page',

  // ===== 链接 =====
  '🔗 链接分享': '🔗 Links',
  '分享可靠的外部资料，方便大家查阅': 'Share reliable external resources for everyone.',
  '来分享第一个有价值的资料吧！': 'Share the first valuable resource!',
  '链接加载失败，请检查网络后重试': 'Failed to load links. Check your network and try again.',
  '还没有任何链接': 'No links yet',
  '链接内容来自第三方网站，社区不对其准确性负责；本社区仅供 WHS 患者交流，不构成医疗建议':
    'Links point to third-party sites; the community is not responsible for their accuracy. This forum is not medical advice.',
  '🔗 提交链接': '🔗 Submit a link',
  '提交链接': 'Submit a link',
  '链接地址': 'Link URL',
  '标题（可编辑）': 'Title (editable)',
  '描述（可编辑）': 'Description (editable)',
  '不填写则由服务端自动抓取标题': 'Leave blank to auto-fetch the title from the server.',
  '不填写则由服务端自动抓取描述…': 'Leave blank to auto-fetch the description…',
  '提交后由服务端自动抓取网页标题与描述（OG 信息）。': 'The server will auto-fetch the page title and description (OG data).',
  '分享提示': 'Sharing tips',
  '💡 分享提示：': '💡 Sharing tips: ',
  '请勿分享需要付费订阅或包含个人隐私信息的链接；涉及医疗内容的资料请优先选择权威机构（医院、基金会、专业学会）发布的来源。':
    'Do not share paywalled links or personal information. For medical content, prefer authoritative sources (hospitals, foundations, professional societies).',
  '打开': 'Open',

  // ===== 帖子详情 / 评论 =====
  '评论（{n}）': 'Comments ({n})',
  '评论': 'Comments',
  '写下你的想法，给 TA 一点鼓励…': 'Write something encouraging…',
  '发表评论': 'Post comment',
  '回复': 'Reply',
  '回复 {name}…': 'Reply to {name}…',
  '点赞': 'Like',
  '已点赞': 'Liked',
  '收藏': 'Save',
  '更多操作': 'More actions',
  '确定要删除吗？删除后无法恢复。': 'Are you sure you want to delete this? This cannot be undone.',
  '删除中…': 'Deleting…',
  '删除后无法恢复': 'This cannot be undone.',
  '还没有评论': 'No comments yet',
  '帖子': 'Posts',
  '知识库页面': 'Library pages',
  '草稿': 'Drafts',
  '我': 'Me',
  '社区成员': 'Community member',
  '未知用户': 'Unknown user',
  '未知角色': 'Unknown role',

  // ===== 表单通用 =====
  '选择分类（可选）': 'Select category (optional)',
  '不分类': 'No category',
  '选择标签（可多选）': 'Select tags (multiple)',
  '点击选择已有标签：': 'Click to select existing tags:',
  '暂无已有标签，输入名称即可创建新标签': 'No tags yet — type a name to create one.',
  '输入新标签名，回车创建': 'Type a new tag name and press Enter',
  '添加': 'Add',
  '内容': 'Content',
  '标题': 'Title',
  '简介（可选）': 'Summary (optional)',
  '父级目录（可选）': 'Parent directory (optional)',
  '不归类（作为根目录页面）': 'No parent (top-level page)',
  '不归类（根目录）': 'No parent (root)',
  '预览': 'Preview',
  '支持 Markdown 简版：': 'Supports a subset of Markdown: ',
  ' # 标题 · **加粗** · *斜体* · - 列表 · > 引用': ' # heading · **bold** · *italic* · - list · > quote',
  '还没有内容，切回「编辑」开始写吧～': 'Nothing here yet — switch to “Edit” and start writing~',
  '发帖提示': 'Posting tips',
  '💡 发帖提示：': '💡 Posting tips: ',
  '请勿在帖中公开姓名、电话、住址等个人隐私信息；涉及孩子健康问题请以主治医生的意见为准，本论坛不提供医疗建议。':
    'Do not share names, phone numbers, addresses or other personal information. For your child’s health, defer to the doctor. This forum is not medical advice.',
  '撰写提示': 'Writing tips',
  '💡 撰写提示：': '💡 Writing tips: ',
  '知识库会长期展示并被多人查阅，请确保内容经过核对；涉及药物剂量与治疗方案请以医生意见为准，本社区不提供医疗建议。':
    'Library pages are long-lived and read by many. Please verify content; for medication doses and treatment plans, defer to your doctor.',
  '支持 Markdown 简版：# 标题 · **加粗** · *斜体* · - 列表 · &gt; 引用':
    'Markdown subset: # heading · **bold** · *italic* · - list · > quote',
  '内容不要太长，方便其他家长快速读完。': 'Keep it concise so other parents can read it quickly.',

  // ===== 收藏 =====
  '🔖 我的收藏夹': '🔖 My Collections',
  '把有用的帖子和知识库页面分类收藏，方便随时回看。': 'Save useful posts and library pages into folders for later.',
  '新建收藏夹': 'New collection',
  '还没有收藏夹': 'No collections yet',
  '点右上角「新建收藏夹」，开始分类收藏吧！': 'Click “New collection” to start organizing your saves!',
  '收藏夹名称': 'Collection name',
  '描述（可选）': 'Description (optional)',
  '创建于 {time}': 'Created {time}',
  '{n} 项': '{n} items',
  '删除收藏夹': 'Delete collection',
  '确定要删除收藏夹「{name}」吗？': 'Delete collection “{name}”?',
  '在「收藏夹」页面可管理全部收藏夹': 'Manage all collections on the Collections page.',
  '加入收藏夹：': 'Add to collection:',
  '新建收藏夹名称…': 'New collection name…',
  '共 {n} 项收藏': '{n} saved items',
  '在帖子或知识库页面点「收藏」即可加入。': 'Click “Save” on a post or library page to add it here.',
  '还没有收藏内容': 'Nothing saved yet',
  '我的收藏': 'My Saved',

  // ===== 个人中心 =====
  '点击更换头像': 'Change avatar',
  '编辑简介': 'Edit bio',
  '保存简介': 'Save bio',
  '个人简介': 'Bio',
  '迈出第一步，分享你的故事吧！': 'Take the first step — share your story!',
  '把你的经验沉淀成长期有用的知识吧！': 'Turn your experience into lasting knowledge!',
  '我的草稿（{n}）': 'My drafts ({n})',
  '等待管理员审核后公开（仅自己可见）': 'Awaiting admin review (visible only to you).',
  '编辑个人资料': 'Edit profile',
  '我的帖子': 'My posts',
  '我的知识库页面': 'My library pages',
  '发布的帖子（{n}）': 'Posts ({n})',
  '知识库（{n}）': 'Library ({n})',
  '草稿（仅自己可见）': 'Draft (visible only to you)',

  // ===== 标签 =====
  '🏷️ 全部标签': '🏷️ All Tags',
  '按主题浏览社区全部内容：点击标签，聚合查看相关的帖子、知识库页面与链接。':
    'Browse everything by topic: click a tag to see related posts, library pages and links.',
  '{n} 次使用': '{n} uses',
  '帖子（{n}）': 'Posts ({n})',
  '知识库页面（{n}）': 'Library pages ({n})',
  '链接（{n}）': 'Links ({n})',
  '标签「{name}」': 'Tag “{name}”',
  '还没有内容': 'Nothing here yet',

  // ===== 通知 =====
  '通知': 'Notifications',
  '还没有通知': 'No notifications yet',

  // ===== 管理 =====
  '🔧 账号管理': '🔧 Account Management',
  '账号管理操作会影响社区成员的访问权限，请谨慎操作': 'Admin actions affect members’ access — proceed with care.',
  '共 {n} 个账号': '{n} accounts',
  '权限管理（管理员）': 'Role management (admin)',
  '当前角色：': 'Current roles: ',
  '无特殊角色': 'No special roles',
  '（默认）': ' (default)',
  '（管理员）': ' (admin)',
  '（角色·未置admin）': ' (role, not admin)',
  '角色：': 'Roles: ',
  '封禁：': 'Ban: ',
  '验证状态：': 'Verification: ',
  '（不能对自己执行降级操作）': ' (cannot demote yourself)',
  '踢出': 'Kick',
  '解封': 'Unban',
  '设为管理员': 'Make admin',
  '取消管理员': 'Remove admin',
  '管理员': 'Admin',
  '成员': 'Member',
  '被封禁': 'Banned',
  '已封禁': 'Banned',
  '验证邮箱': 'Verified email',
  '手动验证': 'Manually verified',
  '未验证': 'Not verified',
  '账号': 'Account',
  '全部账号': 'All accounts',
  '搜索账号…': 'Search accounts…',
  '暂无账号': 'No accounts',
  '账号管理加载失败，请检查网络后重试': 'Failed to load accounts. Check your network and try again.',

  // ===== 补充（认证 / 上传 / 管理 / 杂项） =====
  'StoryDen 登录名仅支持小写字母、数字、下划线和连字符；注册后登录名不可修改':
    'Usernames support lowercase letters, numbers, underscores and hyphens only; they cannot be changed after signup.',
  'StoryDen 社区账号：登录名或邮箱 + 密码': 'Community account: username or email + password',
  'TA 还没有填写个人简介': 'No bio yet',
  '{name}（内置）': '{name} (built-in)',
  '{name}（默认）': '{name} (default)',
  '{n} 名成员已被移出社区（24 小时临时封禁，到期自动恢复）':
    '{n} members have been removed temporarily (24h ban, auto-restored)',
  '上传中…': 'Uploading…',
  '上传文档附件（PDF / Word / Excel / TXT，≤20MB）': 'Upload a document (PDF / Word / Excel / TXT, ≤20MB)',
  '上传视频（MP4 / WebM 等浏览器可播放格式）': 'Upload a video (MP4 / WebM or other browser-playable formats)',
  '不能取消自己的管理员权限': 'You cannot remove your own admin rights',
  '不能封禁自己': 'You cannot ban yourself',
  '个人资料加载失败，请检查网络后重试': 'Failed to load your profile. Check your network and try again.',
  '仅支持 PDF / Word / Excel / TXT 文档': 'Only PDF / Word / Excel / TXT documents are supported',
  '仅支持图片格式（JPG / PNG / GIF 等）': 'Only image files are supported (JPG / PNG / GIF, etc.)',
  '你的密码': 'Your password',
  '保存失败：暂无权限修改个人简介（StoryDen 需管理员权限），请稍后再试':
    'Could not save: you do not have permission to edit your bio (StoryDen requires admin rights). Please try again later.',
  '修改后保存，其他家长将看到最新内容。': 'After saving, other parents will see the latest version.',
  '修改后保存，知识库读者将看到最新内容。': 'After saving, library readers will see the latest version.',
  '共使用 {n} 次': 'Used {n} times',
  '关注 {n}': 'Following {n}',
  '关闭菜单': 'Close menu',
  '再次输入密码': 'Re-enter your password',
  '分享你的经验、困惑或好消息，每一篇帖子都会照亮另一个家庭。':
    'Share your experience, questions or good news — every post can light up another family.',
  '分类（可选）': 'Category (optional)',
  '分配/移除角色、封禁/解封、设置验证状态。权限校验由服务端执行。':
    'Assign/remove roles, ban/unban, set verification status. Permissions are enforced server-side.',
  '分配管理员角色并置 admin 标记': 'Assign the admin role and set the admin flag',
  '切换到浅色模式': 'Switch to light mode',
  '切换到深色模式': 'Switch to dark mode',
  '创建': 'Create',
  '加载个人资料失败': 'Failed to load profile',
  '加载权限信息…': 'Loading permissions…',
  '去写知识库': 'Write a library page',
  '去分享': 'Share',
  '去管理后台解封': 'Unban in admin panel',
  '发布到知识库': 'Publish to library',
  '发布帖子': 'Publish post',
  '发布的帖子': 'Posts',
  '取关': 'Unfollow',
  '图片上传失败，请重试（支持常见图片格式）': 'Image upload failed. Try again (common image formats supported).',
  '头像上传失败，请重试': 'Avatar upload failed. Try again.',
  '头像图片不能超过 5MB，请压缩后重试': 'Avatar images must be under 5MB. Compress it and try again.',
  '如有邀请码请填写': 'Enter the invitation code if you have one',
  '密码强度：{label}，请牢记密码': 'Password strength: {label}. Keep it safe.',
  '密码最长 {n} 位': 'Password must be at most {n} characters',
  '密码至少 {n} 位': 'Password must be at least {n} characters',
  '密码长度不符合要求（至少 8 位）': 'Password length is invalid (at least 8 characters)',
  '密码需包含至少一个字母': 'Password must include at least one letter',
  '密码需包含至少一个数字': 'Password must include at least one number',
  '封禁': 'Ban',
  '尝试次数过多，请 {n} 秒后再试': 'Too many attempts. Try again in {n}s.',
  '尝试过于频繁，请稍后再试': 'Too many attempts. Please try again later.',
  '已封禁（{date}）': 'Banned ({date})',
  '已登录': 'Signed in',
  '已移出社区（封禁中）': 'Temporarily removed (banned)',
  '帖子不存在或已被删除': 'This post does not exist or has been removed.',
  '开始创作': 'Start writing',
  '您没有权限执行此操作': 'You do not have permission to do this.',
  '您没有权限编辑这个知识库页面': 'You do not have permission to edit this library page',
  '您没有权限编辑这篇帖子': 'You do not have permission to edit this post',
  '成员不存在或已注销': 'This member does not exist or has left.',
  '我的知识库贡献': 'My library contributions',
  '我的草稿': 'My drafts',
  '打开 {domain}': 'Open {domain}',
  '打开菜单': 'Open menu',
  '把你的经验沉淀成可以长期查阅的知识：确诊指南、康复方法、照护心得…':
    'Turn your experience into lasting knowledge: diagnosis guides, recovery methods, care tips…',
  '按昵称或账号搜索…': 'Search by name or username…',
  '按昵称搜索成员…': 'Search members by name…',
  '换个关键词试试吧': 'Try a different keyword.',
  '提示：StoryDen 的链接暂不支持标签，标签选择仅作界面兼容':
    'Note: StoryDen links do not support tags; tag selection is UI-only.',
  '插入图片': 'Insert image',
  '插图': 'Image',
  '操作失败，请重试': 'Something went wrong. Please try again.',
  '收藏值得信赖的外部资料：基金会官网、研究文献、照护指南。分享前请确保内容安全可靠。':
    'Collect trustworthy external resources: foundation sites, research papers, care guides. Make sure content is safe before sharing.',
  '收藏夹加载失败，请检查网络后重试': 'Failed to load collections. Check your network and try again.',
  '收藏夹名称（如：康复资料）': 'Collection name (e.g. Recovery Resources)',
  '文件超过 {size}，请压缩后重试': 'File exceeds {size}. Compress it and try again.',
  '文档': 'Document',
  '文档上传失败，请重试': 'Document upload failed. Try again.',
  '无权访问': 'Access denied',
  '无法加载账号列表，请检查登录状态后重试': 'Could not load accounts. Check your login status and try again.',
  '无法获取账号信息，请重新登录后重试': 'Could not fetch account info. Please log in again.',
  '无法连接服务器（{code}）：请确认 Docker Desktop 正在运行、dev server 已重启，然后刷新页面重试':
    'Cannot reach the server ({code}): make sure Docker Desktop is running and the dev server was restarted, then refresh.',
  '更新于 {time}': 'Updated {time}',
  '有人': 'Someone',
  '未找到该账号的管理信息（账号可能已注销）': 'No admin info found for this account (it may have been deactivated).',
  '未知目录': 'Unknown folder',
  '未认证或会话已失效': 'Not authenticated or session expired',
  '本社区仅供 WHS 患者交流，不构成医疗建议；链接内容来自第三方网站，请自行甄别':
    'This community is for WHS families and is not medical advice; links point to third-party sites, please judge for yourself.',
  '权限不足': 'Insufficient permissions',
  '查看成员主页需要登录': 'Log in to view member profiles',
  '查看成员列表需要登录，请先登录后重试': 'Log in to view the member list, then try again.',
  '标签不存在': 'Tag not found',
  '标签内容加载失败，请检查网络后重试': 'Failed to load tagged content. Check your network and try again.',
  '标题和内容都不能为空哦': 'Title and content are both required.',
  '检查中…': 'Checking…',
  '检查链接': 'Check link',
  '正常': 'Active',
  '没有找到匹配的账号': 'No matching accounts',
  '注册成功后将自动登录，登录名请牢记': 'You will be logged in automatically after signup — remember your username.',
  '用一两句话说明这一页的价值，会展示在目录树中…':
    'Describe this page in one or two sentences; shown in the table of contents…',
  '用一句话说清楚你想聊什么': 'Summarize what you want to talk about',
  '用一句话说清楚这一页讲什么': 'Summarize what this page is about',
  '登录名格式不正确：仅支持小写字母、数字、下划线、连字符':
    'Username may only contain lowercase letters, numbers, underscores and hyphens',
  '登录名格式不正确：仅支持小写字母、数字、下划线、连字符（如 xiaoman_mama）':
    'Username may only contain lowercase letters, numbers, underscores and hyphens (e.g. xiaoman_mama)',
  '登录已过期，请重新登录': 'Your session has expired. Please log in again.',
  '看到有用的帖子或知识库页面，点一下「收藏」就能在这里找到。':
    'Click “Save” on a useful post or library page and it will appear here.',
  '知识库页面不存在或已被删除': 'This library page does not exist or has been removed.',
  '知识库页面加载失败，请检查网络后重试': 'Failed to load the library page. Check your network and try again.',
  '确定删除收藏夹「{name}」吗？收藏夹本身会被删除，内容不受影响。':
    'Delete collection “{name}”? The folder is deleted but its items are not.',
  '确定封禁「{name}」吗？\n被封禁的账号将无法登录，其内容不受影响。':
    'Ban “{name}”? The account cannot log in, but its content stays.',
  '确定将「{name}」移出社区吗？\nTA 在 24 小时内无法登录社区，到期自动解封恢复。\nTA 发布的帖子与评论保留。可在管理后台 /admin/members 手动提前解封。':
    'Remove “{name}” from the community? They cannot log in for 24 hours and will be restored automatically. Their posts and comments remain. You can unban early in the admin panel /admin/members.',
  '确定要删除这个知识库页面吗？删除后无法恢复。': 'Delete this library page? This cannot be undone.',
  '确定要删除这篇帖子吗？删除后无法恢复。': 'Delete this post? This cannot be undone.',
  '确定解封「{name}」吗？': 'Unban “{name}”?',
  '移出社区 24 小时（封禁），到期自动解封': 'Remove from the community for 24 hours (ban); auto-restored afterwards',
  '移除「{name}」': 'Remove “{name}”',
  '移除管理员角色与标记': 'Remove admin role and flag',
  '粘贴网址，提交后由服务端自动抓取标题与描述。请只分享与 WHS 家庭相关的、内容可靠的资料。':
    'Paste a URL; the server will auto-fetch the title and description. Please only share reliable resources relevant to WHS families.',
  '继续编辑': 'Continue editing',
  '编辑帖子': 'Edit post',
  '编辑我的资料': 'Edit my profile',
  '编辑收藏夹': 'Edit collection',
  '至少 {n} 位，需包含字母和数字': 'At least {n} characters, with letters and numbers',
  '草稿 · 等待管理员审核后公开（仅自己可见）': 'Draft · awaiting admin review (visible only to you)',
  '视频': 'Video',
  '视频上传失败，请重试（支持 MP4 / WebM 等常见格式）':
    'Video upload failed. Try again (MP4 / WebM or other common formats).',
  '设为「{name}」': 'Set “{name}”',
  '该登录名已被占用，换一个试试': 'This username is already taken — try another',
  '请 {n} 秒后再试': 'Try again in {n}s',
  '请先登录': 'Please log in first',
  '请填写所有必填项': 'Please fill in all required fields.',
  '请求参数有误，请检查后重试': 'Invalid request. Please check and try again.',
  '请求参数错误': 'Invalid request parameters',
  '请求失败（HTTP {status}）': 'Request failed (HTTP {status})',
  '请求失败（{code}）：{detail}': 'Request failed ({code}): {detail}',
  '请求过于频繁，请稍后再试': 'Too many requests. Please try again later.',
  '请稍候…': 'Please wait…',
  '请输入链接地址哦': 'Please enter a link URL.',
  '请选择图片文件（JPG / PNG / GIF 等）': 'Please choose an image file (JPG / PNG / GIF, etc.)',
  '请选择视频文件（MP4 / WebM 等浏览器可播放格式）':
    'Please choose a video file (MP4 / WebM or other browser-playable formats)',
  '账号或密码错误，请重试': 'Incorrect username or password. Please try again.',
  '账号管理仅对管理员开放': 'Account management is for admins only',
  '账号管理需要管理员权限': 'Account management requires admin privileges',
  '踢出中…': 'Kicking…',
  '返回帖子': 'Back to post',
  '返回成员列表': 'Back to members',
  '返回收藏夹': 'Back to collections',
  '返回标签列表': 'Back to tags',
  '返回知识库': 'Back to library',
  '返回页面': 'Back to page',
  '还没有人分享链接': 'No one has shared links yet',
  '还没有写过知识库页面': 'No library pages yet',
  '还没有发布过帖子': 'No posts yet',
  '还没有收藏任何内容': 'Nothing saved yet',
  '还没有收藏夹，先新建一个吧': 'No collections yet — create one first.',
  '这个收藏夹还是空的': 'This collection is empty',
  '这个标签下还没有帖子': 'No posts with this tag',
  '这个标签下还没有知识库页面': 'No library pages with this tag',
  '这个标签下还没有链接': 'No links with this tag',
  '退出登录': 'Log out',
  '邀请码无效或已过期': 'Invalid or expired invitation code',
  '链接地址需要以 http:// 或 https:// 开头': 'The link must start with http:// or https://',
  '链接格式有误，请确认后重试，或手动填写标题与描述':
    'Invalid link. Check it and retry, or fill in the title and description manually.',
  '👥 关注': '👥 Following',
  '👥 粉丝': '👥 Followers',
  '：{detail}': ': {detail}',
  '标签（可多选）': 'Tags (multiple)',
  '支持 Markdown 简版：\n# 一级标题\n## 二级标题\n**加粗**、*斜体*\n- 列表项\n> 引用\n\n内容不要太长，方便其他家长快速读完。':
    'Markdown subset:\n# Heading\n## Subheading\n**bold**, *italic*\n- list item\n> quote\n\nKeep it concise so other parents can read it quickly.',
};

// 模块级当前语言（供无 hook 场景使用，如时间格式化 / axios 拦截器）
let currentLang: Lang = 'zh';

export function setLangGlobal(lang: Lang) {
  currentLang = lang;
}

export function getLangGlobal(): Lang {
  return currentLang;
}

// 核心翻译函数：t(key, vars?)
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>
): string {
  let s = lang === 'en' ? en[key] ?? key : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

// 浏览器侧当前语言（localStorage / 浏览器语言），模块级工具用
export function currentLangFromStorage(): Lang {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
      return 'en';
    }
    return 'zh';
  } catch {
    return 'zh';
  }
}

// 无 hook 场景的快捷翻译（跟随当前会话语言；LangProvider 挂载/切换时同步）
export function tr(key: string, vars?: Record<string, string | number>): string {
  return translate(getLangGlobal(), key, vars);
}
