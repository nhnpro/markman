export interface Document {
  id: string;
  title: string;
  icon: string;
  content: string; // full markdown including frontmatter
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}

export interface AppState {
  documents: Document[];
  activeDocId: string | null;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  isFlipped: boolean;
  editMode: boolean;
}

export type AppAction =
  | { type: 'SET_ACTIVE_DOC'; id: string }
  | { type: 'ADD_DOCUMENT'; doc: Document }
  | { type: 'UPDATE_DOCUMENT'; id: string; content: string }
  | { type: 'DELETE_DOCUMENT'; id: string }
  | { type: 'TOGGLE_FAVORITE'; id: string }
  | { type: 'TOGGLE_LEFT_SIDEBAR' }
  | { type: 'TOGGLE_RIGHT_SIDEBAR' }
  | { type: 'SET_FLIPPED'; flipped: boolean }
  | { type: 'TOGGLE_EDIT_MODE' };
