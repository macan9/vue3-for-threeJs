// 菜单权限配置（前端显示层）
// - roles: 允许展示该菜单的角色列表
// - 默认：不配置则所有用户可见
export const menu_permission_config = {
    // 用户管理（管理员可见）
    '1-2': { roles: ['admin'] },
    // 用户日志（管理员可见）
    '1-3': { roles: ['admin'] },
    // 图床管理（管理员可见）
    '1-4': { roles: ['admin'] },
    

}

// 角色判定（可按需扩展）
export const resolveUserRoles = (user = {}) => {
    const auth = user?.auth ?? user?.authority ?? user?.role
    const isAdmin = Number(auth) === 1
    return isAdmin ? ['admin'] : ['user']
}

