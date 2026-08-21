export interface NavItem {
  label: string;
  route: string;
  icon: 'clipboard' | 'smile' | 'users' | 'home' | 'globe';
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Diário do turno', route: '/diario-do-turno', icon: 'clipboard' },
  { label: 'Gerenciar cadastros', route: '/gerenciar-cadastros', icon: 'smile' },
  { label: 'Gerenciar voluntários', route: '/gerenciar-voluntarios', icon: 'users' },
  { label: 'Gerenciar unidades e turmas', route: '/gerenciar-unidades-e-turmas', icon: 'home' },
  { label: 'Gerenciar conteúdo público', route: '/conteudo-publico', icon: 'globe' },
];
