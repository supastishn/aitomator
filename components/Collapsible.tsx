import { PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

interface Props extends PropsWithChildren {
  title: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function Collapsible({ children, title, isExpanded = false, onToggle }: Props) {
  return (
    <View>
      <TouchableOpacity
        style={styles.heading}
        onPress={onToggle}
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color="#687076"
          style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
        />

        <Text style={styles.defaultSemiBold}>{title}</Text>
      </TouchableOpacity>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#11181C',
  },
});
