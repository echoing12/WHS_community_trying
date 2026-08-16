// ============================================================
//  角色结构调整脚本（在浏览器控制台执行）
// ============================================================
// 用法：
//   1. 用管理员账号登录本站（echo）
//   2. 按 F12 打开浏览器开发者工具 → Console
//   3. 把本文件全部内容粘贴进去，回车执行
// 作用（三步，均不修改任何角色权限，权限由你自行设定）：
//   1. 先把内置 guest 角色（现名 Readers）改名为 Guest —— 必须先改它！
//      roles.name 有唯一索引，两个角色不能重名（否则会 500）
//   2. 再把内置 member 角色（现名 Reseachers，每个账号的默认角色）改名为 Readers
//   3. 新建自定义角色 Researchers（绿色，权限留空待你设定），
//      该角色可通过本站「管理」页对单个账号分配/移除
// 原理说明：Storyden 会给每个账号注入内置 member 角色且后端禁止通过 API
// 分配/移除它，所以「研究员」必须是一个自定义角色才能由管理界面管理。
// 注意：脚本只改角色名称和新建角色，绝不修改任何权限配置。
// ============================================================

(async () => {
  const BASE = '/api';
  // Storyden 内置角色 id（源码固定常量）
  const ROLE_MEMBER = '000000000000000000m0'; // 默认角色（现 Reseachers）
  const ROLE_GUEST = '0000000000000000000g';  // 访客角色（现 Readers）

  const req = async (url, method, body) => {
    const res = await fetch(BASE + url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const d = await res.json();
        detail = d?.error?.message || d?.message || JSON.stringify(d).slice(0, 200);
      } catch { /* 忽略解析失败 */ }
      throw new Error(`HTTP ${res.status}${detail ? `：${detail}` : ''}`);
    }
    return res.status === 204 ? null : res.json();
  };

  const log = (...a) => console.log('%c[角色变更]', 'color:#16a34a;font-weight:bold', ...a);
  const err = (...a) => console.error('%c[角色变更]', 'color:#dc2626;font-weight:bold', ...a);

  try {
    // 0. 会话与管理员身份检查
    const session = await req('/session', 'GET');
    if (!session?.account) { err('未登录！请先登录管理员账号再运行本脚本。'); return; }
    if (!session.account.admin) { err(`当前账号 ${session.account.handle} 不是管理员，无法执行。`); return; }
    log('已确认管理员身份：', session.account.handle);

    // 1. 读取当前角色列表
    const { roles } = await req('/roles', 'GET');
    const member = roles.find((r) => r.id === ROLE_MEMBER);
    const guest = roles.find((r) => r.id === ROLE_GUEST);
    const hasResearchers = roles.some((r) => r.name === 'Researchers');
    log('当前角色：', roles.map((r) => `${r.name}(${r.id})`).join('、'));

    // 2. 展示执行计划并确认
    const steps = [];
    if (!guest) steps.push('⚠️ 找不到内置 guest 角色');
    else if (guest.name === 'Guest') steps.push('✅ guest 已是 Guest，跳过');
    else steps.push(`1️⃣ 将「${guest.name}」改名为「Guest」（先改它，避免与下一步撞名）`);
    if (!member) steps.push('⚠️ 找不到内置 member 角色');
    else if (member.name === 'Readers') steps.push('✅ member 已是 Readers，跳过');
    else steps.push(`2️⃣ 将「${member.name}」改名为「Readers」（不碰权限）`);
    if (hasResearchers) steps.push('✅ Researchers 已存在，跳过创建');
    else steps.push('3️⃣ 新建角色「Researchers」（绿色，权限留空，由你之后自行设定）');
    log('执行计划：\n' + steps.join('\n'));

    if (!confirm('确认执行以上角色变更吗？点击「确定」开始执行。')) {
      log('已取消，未做任何修改。');
      return;
    }

    // 3. 先改名 guest → Guest（name 唯一索引：必须先清掉旧的「Readers」）
    if (guest && guest.name !== 'Guest') {
      try {
        await req(`/roles/${ROLE_GUEST}`, 'PATCH', { name: 'Guest' });
        log('✅ 访客角色已改名为 Guest');
      } catch (e) {
        err('❌ 改 guest 失败：', e.message, '（继续执行后续步骤）');
      }
    } else if (guest) {
      log('✅ guest 已是 Guest，跳过');
    }

    // 4. 再改名 member → Readers
    if (member && member.name !== 'Readers') {
      try {
        await req(`/roles/${ROLE_MEMBER}`, 'PATCH', { name: 'Readers' });
        log('✅ 默认角色已改名为 Readers');
      } catch (e) {
        err('❌ 改 member 失败：', e.message, '（提示：若报 HTTP 500，说明还有另一个角色占用「Readers」这个名字，需先改掉它）');
      }
    } else if (member) {
      log('✅ member 已是 Readers，跳过');
    }

    // 5. 新建 Researchers（权限留空，由你设定）
    if (!hasResearchers) {
      try {
        await req('/roles', 'POST', { name: 'Researchers', colour: 'green', permissions: [] });
        log('✅ 已创建角色 Researchers');
      } catch (e) {
        err('❌ 创建 Researchers 失败：', e.message);
      }
    } else {
      log('✅ Researchers 已存在，跳过');
    }

    // 6. 最终校验
    const { roles: after } = await req('/roles', 'GET');
    log('变更后的角色列表：');
    console.table(after.map((r) => ({ 名称: r.name, 颜色: r.colour, 权限数: (r.permissions || []).length, id: r.id })));
    log('完成！刷新页面即可看到效果。');
    log('下一步：在浏览器打开 http://localhost:8000 官方管理后台 → 角色管理，给 Researchers 配置你想要的权限（或告诉我你想要的权限，我帮你改）。');
  } catch (e) {
    err('执行失败：', e.message);
    err('提示：请确认当前登录的是管理员账号，且页面与后端网络正常。');
  }
})();
