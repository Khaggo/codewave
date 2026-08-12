import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { buildOwnedVehicleInsuranceLabel } from '../../lib/insuranceClient';
import { getVehicleDisplayLabel, getVehiclePlateLabel } from '../../lib/vehicleDisplay.mjs';
import { colors, radius } from '../../theme';
import { filterInsuranceOwnedVehicles } from './insuranceVehicleSelectionModel.mjs';

const VEHICLE_ROW_HEIGHT = 76;
const INITIAL_RENDER_COUNT = 8;

export default function InsuranceVehiclePicker({
  onAddVehicle,
  onClose,
  onSelectVehicle,
  selectedVehicleId,
  vehicles,
  visible,
}) {
  const [query, setQuery] = useState('');
  const filteredVehicles = useMemo(
    () => filterInsuranceOwnedVehicles(vehicles, query),
    [query, vehicles],
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const resultSummary = query.trim()
    ? `${filteredVehicles.length} of ${vehicles.length} vehicles`
    : `${vehicles.length} vehicles`;

  const renderVehicle = ({ item: vehicle }) => {
    const selected = vehicle.id === selectedVehicleId;
    const vehicleLabel = buildOwnedVehicleInsuranceLabel(vehicle);

    return (
      <TouchableOpacity
        accessibilityLabel={`${vehicleLabel}${selected ? ', current vehicle' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        activeOpacity={0.88}
        onPress={() => {
          onSelectVehicle(vehicle.id);
          onClose();
        }}
        style={[styles.vehicleRow, selected && styles.vehicleRowSelected]}
      >
        <View style={styles.vehicleLabelCopy}>
          <Text numberOfLines={2} ellipsizeMode="tail" style={styles.vehicleLabel}>
            {getVehicleDisplayLabel(vehicle)}
          </Text>
          <Text numberOfLines={1} style={styles.vehiclePlateLabel}>
            {getVehiclePlateLabel(vehicle)}
          </Text>
        </View>
        {selected ? (
          <View style={styles.currentBadge}>
            <MaterialCommunityIcons name="check" size={14} color={colors.primary} />
            <Text style={styles.currentLabel}>Current</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close vehicle picker"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.dismissLayer}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                Choose vehicle
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.resultSummary}>
                {resultSummary}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close vehicle picker"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchField}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
            <TextInput
              accessibilityLabel="Search vehicles"
              autoCapitalize="none"
              autoCorrect={false}
              nativeID="insurance-vehicle-search"
              onChangeText={setQuery}
              placeholder="Search plate, make, model, or year"
              placeholderTextColor={colors.labelText}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query ? (
              <TouchableOpacity
                accessibilityLabel="Clear vehicle search"
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => setQuery('')}
                style={styles.clearButton}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            contentContainerStyle={
              filteredVehicles.length ? styles.listContent : styles.emptyListContent
            }
            data={filteredVehicles}
            getItemLayout={(_, index) => ({
              index,
              length: VEHICLE_ROW_HEIGHT,
              offset: VEHICLE_ROW_HEIGHT * index,
            })}
            initialNumToRender={INITIAL_RENDER_COUNT}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(vehicle) => vehicle.id}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="car-search-outline"
                  size={26}
                  color={colors.mutedText}
                />
                <Text style={styles.emptyTitle}>No matching vehicle</Text>
                <Text style={styles.emptyMessage}>
                  Try another plate, make, model, or year.
                </Text>
              </View>
            }
            ListFooterComponent={
              <TouchableOpacity
                accessibilityLabel="Add vehicle"
                accessibilityRole="button"
                activeOpacity={0.88}
                onPress={onAddVehicle}
                style={styles.addVehicleRow}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                <Text style={styles.addVehicleLabel}>Add vehicle</Text>
              </TouchableOpacity>
            }
            maxToRenderPerBatch={INITIAL_RENDER_COUNT}
            renderItem={renderVehicle}
            showsVerticalScrollIndicator
            style={styles.list}
            updateCellsBatchingPeriod={32}
            windowSize={5}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  resultSummary: {
    marginTop: 2,
    color: colors.mutedText,
    fontSize: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  searchField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
    paddingLeft: 12,
    paddingRight: 4,
  },
  searchInput: {
    minWidth: 0,
    minHeight: 46,
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 10,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 420,
  },
  listContent: {
    paddingBottom: 4,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  vehicleRow: {
    height: VEHICLE_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingHorizontal: 10,
  },
  vehicleRowSelected: {
    backgroundColor: colors.primarySoft,
  },
  vehicleLabel: {
    minWidth: 0,
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  vehicleLabelCopy: {
    minWidth: 0,
    flex: 1,
  },
  vehiclePlateLabel: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  currentBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  currentLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyMessage: {
    marginTop: 4,
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  addVehicleRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addVehicleLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});
