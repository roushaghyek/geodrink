import { StyleSheet } from 'react-native';

export const gameStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  cityCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 18,
    // backgroundColor set dynamically via theme colors
  },
  cityTitle: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  countryText: {
    fontSize: 17,
    marginTop: 6,
    textAlign: 'center',
  },
  questionSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  temperatureInput: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    borderBottomWidth: 4,
    width: 132,
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    // borderBottomColor set dynamically via theme colors
  },
  minusButton: {
    minWidth: 60,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  minusButtonActive: {
    opacity: 0.85,
  },
  minusButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 18,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
    // backgroundColor set dynamically via theme colors
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: '700',
    // color set dynamically via theme colors
  },
  unitText: {
    fontSize: 32,
    fontWeight: '600',
  },
  resultSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  comparisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
    borderRadius: 16,
    // backgroundColor set dynamically via theme colors
  },
  comparisonItem: {
    alignItems: 'center',
  },
  tempNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 50,
    marginTop: 16,
    // backgroundColor set dynamically via theme colors
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    // backgroundColor set dynamically via theme colors
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    // color set dynamically via theme colors
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    marginTop: 2,
    // backgroundColor set dynamically via theme colors
  },
  scoreItem: {
    alignItems: 'center',
    minWidth: 74,
    flexGrow: 1,
    flexBasis: 74,
  },
  scoreName: {
    maxWidth: 92,
    textAlign: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
    // color set dynamically via theme colors
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 18,
    fontWeight: '600',
  },
  largeTitle: {
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 16,
    textAlign: 'center',
  },
  largeNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  finalScoreCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 24,
    // backgroundColor set dynamically via theme colors
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 20,
  },
  scoreColumn: {
    alignItems: 'center',
    minWidth: 82,
  },
  accuracyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
});
