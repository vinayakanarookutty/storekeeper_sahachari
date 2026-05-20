import { StyleSheet } from 'react-native';

 const COLORS = {
  bg: '#FFF9E6',
  card: '#FFFFFF',
  primary: '#DAA520',
  textDark: '#2D2416',
  textLight: '#856404',
  danger: '#FF3B30',
  border: '#E0D6C3',
};

export const styles = StyleSheet.create({

   
  container: { flex: 1, backgroundColor: COLORS.bg },
  // ADDED contentContainerStyle to ensure scrolling works and bottom button is visible
  scrollContent: {
    paddingBottom: 65,
  },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  camBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: COLORS.bg },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark },
  userEmail: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15, marginTop: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  infoIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  
  logoutBtn: { margin: 20, backgroundColor: COLORS.card, padding: 18, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.danger },
  logoutText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark },
  modalInput: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 15, fontSize: 16, color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textLight, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});