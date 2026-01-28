import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useExpenses } from '@/hooks/expense-store';
import { useTheme } from '@/hooks/theme-store';
import { useFirstTime } from '@/hooks/first-time-store';
import { ExpenseCard } from '@/components/ExpenseCard';
import CategoryFilter from '@/components/CategoryFilter';
import { AddExpenseSheet } from '@/components/AddExpenseSheet';
import BudgetCard from '@/components/BudgetCard';
import SetBudgetSheet from '@/components/SetBudgetSheet';
import HowItWorksScreen from '@/components/HowItWorksScreen';

export default function ExpensesScreen() {
  const { expenses, stats, isLoading } = useExpenses();
  const { colors } = useTheme();
  const { isFirstTime, markGuideAsSeen, isLoading: isLoadingFirstTime } = useFirstTime();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showBudgetSheet, setShowBudgetSheet] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    if (!isLoadingFirstTime && isFirstTime) {
      const timer = setTimeout(() => {
        setShowGuide(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTime, isLoadingFirstTime]);

  const handleCloseGuide = () => {
    setShowGuide(false);
    markGuideAsSeen();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalAmount}>₹{stats.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddSheet(true)}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <BudgetCard onSetBudget={() => setShowBudgetSheet(true)} />
        <CategoryFilter />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first expense
            </Text>
          </View>
        }
      />

      <AddExpenseSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
      />

      <SetBudgetSheet
        isVisible={showBudgetSheet}
        onClose={() => setShowBudgetSheet(false)}
      />

      <Modal
        visible={showGuide}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseGuide}
      >
        <View style={styles.guideModalContainer}>
          <View style={styles.guideModalHeader}>
            <Text style={styles.guideModalTitle}>Welcome to Expense Tracker!</Text>
            <TouchableOpacity onPress={handleCloseGuide}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <HowItWorksScreen
            onGetStarted={handleCloseGuide}
            showGetStartedButton={true}
          />
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  guideModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  guideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  guideModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    fontSize: 16,
    color: colors.primary,
  },
});