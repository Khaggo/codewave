import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius } from '../theme';
import { cloneDate, formatDate, monthLabels } from '../utils/validation';

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const buildCalendarDays = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - firstDay + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }

    return new Date(year, month, dayNumber);
  });
};

const buildYearOptions = (maxYear, minYear) =>
  Array.from({ length: Math.max(maxYear - minYear + 1, 1) }, (_, index) => maxYear - index);

const isSameDay = (left, right) =>
  left instanceof Date &&
  right instanceof Date &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  editable = true,
  title = 'Select Date',
  subtitle = 'Choose Year, then Month, then Day.',
  trailingLabel = 'Pick Date',
  minimumDate = null,
  maximumDate = null,
  initialPickerStep = 'year',
}) {
  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedMinimumDate = minimumDate ? cloneDate(minimumDate) : null;
  const normalizedMaximumDate = maximumDate ? cloneDate(maximumDate) : normalizedToday;
  const [isVisible, setIsVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => cloneDate(value) || normalizedMinimumDate || normalizedMaximumDate || normalizedToday,
  );
  const [pickerStep, setPickerStep] = useState('year');

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const yearOptions = useMemo(
    () =>
      buildYearOptions(
        (normalizedMaximumDate || normalizedToday).getFullYear(),
        (normalizedMinimumDate || new Date(normalizedToday.getFullYear() - 100, 0, 1)).getFullYear(),
      ),
    [normalizedMaximumDate, normalizedMinimumDate, normalizedToday],
  );
  const displayValue = formatDate(value);

  const handleOpen = () => {
    const nextMonth = cloneDate(value) || normalizedMinimumDate || normalizedMaximumDate || normalizedToday;
    setVisibleMonth(nextMonth);
    setPickerStep(value ? 'day' : initialPickerStep);
    setIsVisible(true);
  };

  const handleSelectYear = (year) => {
    setVisibleMonth((currentMonth) => new Date(year, currentMonth.getMonth(), 1));
    setPickerStep('month');
  };

  const handleSelectMonth = (monthIndex) => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), monthIndex, 1));
    setPickerStep('day');
  };

  const handleSelectDay = (selectedDate) => {
    onChange(cloneDate(selectedDate));
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={editable ? handleOpen : undefined}
        disabled={!editable}
        style={[
          styles.input,
          editable && isVisible && styles.inputFocused,
          !editable && styles.inputReadonly,
          error && styles.inputError,
        ]}
      >
        <Text style={[styles.valueText, !displayValue && styles.placeholderText]}>
          {displayValue || placeholder}
        </Text>
        <Text style={[styles.trailingText, !editable && styles.trailingTextReadonly]}>
          {editable ? trailingLabel : 'Locked'}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <Modal
        animationType="fade"
        transparent
        visible={isVisible}
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => null}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{subtitle}</Text>

            <View style={styles.stepRow}>
              <TouchableOpacity
                style={[styles.stepChip, pickerStep === 'year' && styles.stepChipActive]}
                onPress={() => setPickerStep('year')}
              >
                <Text style={[styles.stepChipText, pickerStep === 'year' && styles.stepChipTextActive]}>
                  {visibleMonth.getFullYear()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepChip, pickerStep === 'month' && styles.stepChipActive]}
                onPress={() => setPickerStep('month')}
              >
                <Text style={[styles.stepChipText, pickerStep === 'month' && styles.stepChipTextActive]}>
                  {monthLabels[visibleMonth.getMonth()]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepChip, pickerStep === 'day' && styles.stepChipActive]}
                onPress={() => setPickerStep('day')}
              >
                <Text style={[styles.stepChipText, pickerStep === 'day' && styles.stepChipTextActive]}>
                  Day
                </Text>
              </TouchableOpacity>
            </View>

            {pickerStep === 'year' ? (
              <ScrollView style={styles.selectionPanel} showsVerticalScrollIndicator={false}>
                <View style={styles.optionGrid}>
                  {yearOptions.map((year) => {
                    const isSelected = year === visibleMonth.getFullYear();

                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                        onPress={() => handleSelectYear(year)}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{year}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            {pickerStep === 'month' ? (
              <View style={styles.selectionPanel}>
                <View style={styles.optionGrid}>
                  {monthLabels.map((monthLabel, index) => {
                    const isSelected = index === visibleMonth.getMonth();

                    return (
                      <TouchableOpacity
                        key={monthLabel}
                        style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                        onPress={() => handleSelectMonth(index)}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                          {monthLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {pickerStep === 'day' ? (
              <View style={styles.selectionPanel}>
                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((weekday) => (
                    <Text key={weekday} style={styles.weekdayText}>
                      {weekday}
                    </Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {calendarDays.map((dateValue, index) => {
                    const isBeforeMinimumDate =
                      dateValue && normalizedMinimumDate ? dateValue < normalizedMinimumDate : false;
                    const isAfterMaximumDate =
                      dateValue && normalizedMaximumDate ? dateValue > normalizedMaximumDate : false;
                    const isDisabled = isBeforeMinimumDate || isAfterMaximumDate;
                    const isSelected = dateValue ? isSameDay(dateValue, value) : false;

                    return (
                      <TouchableOpacity
                        key={`${visibleMonth.getMonth()}-${index}`}
                        style={[
                          styles.dayCell,
                          !dateValue && styles.dayCellEmpty,
                          isSelected && styles.dayCellSelected,
                        ]}
                        disabled={!dateValue || isDisabled}
                        onPress={() => handleSelectDay(dateValue)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isDisabled && styles.dayTextDisabled,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {dateValue ? dateValue.getDate() : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <TouchableOpacity style={styles.closeButton} onPress={() => setIsVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 2,
  },
  inputReadonly: {
    backgroundColor: colors.readonly,
  },
  inputError: {
    borderColor: colors.danger,
  },
  valueText: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: colors.mutedText,
  },
  trailingText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  trailingTextReadonly: {
    color: colors.mutedText,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  helperText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: 20,
    maxHeight: '82%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceMuted,
  },
  stepChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  stepChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  stepChipTextActive: {
    color: colors.primary,
  },
  selectionPanel: {
    minHeight: 280,
    marginBottom: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    width: '31%',
    minHeight: 46,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: colors.background,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextActive: {
    color: colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    marginBottom: 6,
  },
  dayCellEmpty: {
    opacity: 0,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: colors.border,
  },
  dayTextSelected: {
    color: colors.onPrimary,
    fontWeight: '800',
  },
  closeButton: {
    minHeight: 48,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
