import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2D2416',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },

  form: {
    width: '100%',
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

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0D6C3',
    marginBottom: 16,
  },

  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2D2416',
  },

  eyeIcon: {
    paddingHorizontal: 16,
  },

  textArea: {
    minHeight: 80,
  },

  helperText: {
    fontSize: 12,
    color: '#A89378',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },

  button: {
    backgroundColor: '#DAA520',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },

  footerText: {
    color: '#666',
    fontSize: 14,
  },

  linkText: {
    color: '#DAA520',
    fontSize: 14,
    fontWeight: '600',
  },
});