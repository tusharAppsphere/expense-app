// src/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Manage your finances.',
    subtitle: 'Forget everything you know about the chaotic world of finance. It can be easy.',
    bg: '#FFFFFF',
    illustration: { icon: 'people', color: '#4B5EFC', bg: '#E8EAFE' },
  },
  {
    id: '2',
    title: 'Control your savings.',
    subtitle: 'Forget everything you know about the chaotic world of finance. It can be easy.',
    bg: '#FFFFFF',
    illustration: { icon: 'wallet', color: '#F5E642', bg: '#4B5EFC' },
  },
  {
    id: '3',
    title: 'Track every expense.',
    subtitle: 'Forget everything you know about the chaotic world of finance. It can be easy.',
    bg: '#FFFFFF',
    illustration: { icon: 'bar-chart', color: '#0D0D0D', bg: '#F5E642' },
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[slideStyles.slide, { backgroundColor: item.bg }]}>
      {/* Illustration area */}
      <View style={slideStyles.illustrationArea}>
        <View style={[slideStyles.illustrationCircle, { backgroundColor: item.illustration.bg }]}>
          <Ionicons name={item.illustration.icon} size={80} color={item.illustration.color} />
        </View>
        {/* Decorative shapes */}
        <View style={[slideStyles.decorRect, { backgroundColor: COLORS.gray200, top: 60, left: 30, width: 80, height: 12, transform: [{ rotate: '-5deg' }] }]} />
        <View style={[slideStyles.decorRect, { backgroundColor: COLORS.gray200, top: 80, left: 50, width: 120, height: 12, transform: [{ rotate: '-5deg' }] }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      />

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        <Text style={styles.title}>{SLIDES[currentIndex].title}</Text>
        <Text style={styles.subtitle}>{SLIDES[currentIndex].subtitle}</Text>

        <View style={styles.footer}>
          {/* Dot indicators */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Arrow button */}
          <TouchableOpacity onPress={handleNext} style={styles.arrowBtn} activeOpacity={0.85}>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  bottomContent: { paddingHorizontal: 28, paddingBottom: 48, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, lineHeight: 34 },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 32 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 28, backgroundColor: COLORS.black },
  dotInactive: { width: 8, backgroundColor: COLORS.gray300 },
  arrowBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.black,
    alignItems: 'center', justifyContent: 'center',
  },
});

const slideStyles = StyleSheet.create({
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  illustrationArea: { width: width * 0.7, height: 280, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  illustrationCircle: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
  },
  decorRect: { position: 'absolute', borderRadius: 6 },
});
