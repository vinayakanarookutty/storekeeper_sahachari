import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C3',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D2416',
  },

  content: {
    padding: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 6,
    marginLeft: 4,
  },

  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },

  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 20,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    color: '#2D2416',
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  parallelContainer: {
    flexDirection: 'row',
    gap: 10,
  },

  unitSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    flex: 1,
    justifyContent: 'space-between',
  },

  unitText: {
    fontSize: 16,
    color: '#2D2416',
    fontWeight: 'bold',
  },

  section: {
    marginVertical: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 15,
  },

  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 5,
  },

  imageWrapper: {
    position: 'relative',
  },

  imagePreview: {
    width: 85,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#E0D6C3',
  },

  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  pickButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DAA520',
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },

  pickButtonText: {
    color: '#DAA520',
    fontWeight: '600',
  },

  uploadButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },

  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  createButton: {
    backgroundColor: '#DAA520',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
  },

  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },

  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },

  modalItemText: {
    fontSize: 16,
  },
});