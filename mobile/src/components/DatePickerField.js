import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { cloneDate, formatDate, monthLabels } from '../utils/validation';
import styles from './datePickerFieldStyles';

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
  const { width: windowWidth } = useWindowDimensions();
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
  const isCompactLayout = windowWidth < 360;
  const optionButtonStyle = isCompactLayout
    ? styles.optionButtonCompact
    : styles.optionButtonRegular;
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
        accessibilityLabel={`${label}. ${displayValue || placeholder}. ${
          editable ? trailingLabel : 'Locked'
        }`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !editable, expanded: isVisible }}
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
        <Pressable
          accessible={false}
          style={[styles.overlay, isCompactLayout && styles.overlayCompact]}
          onPress={() => setIsVisible(false)}
        >
          <Pressable
            accessibilityViewIsModal
            style={[styles.modalCard, isCompactLayout && styles.modalCardCompact]}
            onPress={() => null}
          >
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{subtitle}</Text>

            <View style={[styles.stepRow, isCompactLayout && styles.stepRowCompact]}>
              <TouchableOpacity
                accessibilityLabel={`Choose year ${visibleMonth.getFullYear()}`}
                accessibilityRole="button"
                accessibilityState={{ selected: pickerStep === 'year' }}
                style={[styles.stepChip, pickerStep === 'year' && styles.stepChipActive]}
                onPress={() => setPickerStep('year')}
              >
                <Text style={[styles.stepChipText, pickerStep === 'year' && styles.stepChipTextActive]}>
                  {visibleMonth.getFullYear()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={`Choose month ${monthLabels[visibleMonth.getMonth()]}`}
                accessibilityRole="button"
                accessibilityState={{ selected: pickerStep === 'month' }}
                style={[styles.stepChip, pickerStep === 'month' && styles.stepChipActive]}
                onPress={() => setPickerStep('month')}
              >
                <Text style={[styles.stepChipText, pickerStep === 'month' && styles.stepChipTextActive]}>
                  {monthLabels[visibleMonth.getMonth()]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Choose day"
                accessibilityRole="button"
                accessibilityState={{ selected: pickerStep === 'day' }}
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
                        accessibilityLabel={`Choose year ${year}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={year}
                        style={[
                          styles.optionButton,
                          optionButtonStyle,
                          isSelected && styles.optionButtonActive,
                        ]}
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
                        accessibilityLabel={`Choose month ${monthLabel}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={monthLabel}
                        style={[
                          styles.optionButton,
                          optionButtonStyle,
                          isSelected && styles.optionButtonActive,
                        ]}
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
                    if (!dateValue) {
                      return (
                        <View
                          key={`${visibleMonth.getMonth()}-${index}`}
                          style={[styles.dayCell, styles.dayCellEmpty]}
                        />
                      );
                    }

                    const isBeforeMinimumDate =
                      normalizedMinimumDate ? dateValue < normalizedMinimumDate : false;
                    const isAfterMaximumDate =
                      normalizedMaximumDate ? dateValue > normalizedMaximumDate : false;
                    const isDisabled = isBeforeMinimumDate || isAfterMaximumDate;
                    const isSelected = isSameDay(dateValue, value);

                    return (
                      <TouchableOpacity
                        accessibilityLabel={`Choose ${dateValue.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                        key={`${visibleMonth.getMonth()}-${index}`}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                        ]}
                        disabled={isDisabled}
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

            <TouchableOpacity
              accessibilityLabel="Close date picker"
              accessibilityRole="button"
              style={styles.closeButton}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
