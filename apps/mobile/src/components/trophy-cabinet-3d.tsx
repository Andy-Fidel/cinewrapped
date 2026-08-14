import type { AchievementSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from './ui';

const supportsCanvas = Platform.OS === 'web';

export function TrophyCabinet3D({ achievements }: { achievements: AchievementSummary[] }) {
  const colors = useColors();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(achievements[0]?.id ?? null);

  const selectedAchievement = achievements.find((a) => a.id === selectedId) ?? achievements[0];

  useEffect(() => {
    if (!supportsCanvas) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 340);
    const height = (canvas.height = 240);

    let rotationY = 0;
    let rotationX = 0.15;
    let isDragging = false;
    let lastMousePos = { x: 0, y: 0 };

    // 3D Projection Helper
    const project = (x: number, y: number, z: number) => {
      const scale = 320 / (320 + z);
      return {
        x: width / 2 + x * scale,
        y: height / 2 + y * scale,
        scale,
        z,
      };
    };

    // Rotate 3D Vector
    const rotate3D = (x: number, y: number, z: number, rotX: number, rotY: number) => {
      // Rotate Y
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;

      // Rotate X
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const ry = y * cosX - rz * sinX;
      const rz2 = y * sinX + rz * cosX;

      return { x: rx, y: ry, z: rz2 };
    };

    const transformScenePoint = (x: number, y: number, z: number) => {
      const shelfCenterY = 55;
      const rotated = rotate3D(x, y - shelfCenterY, z, rotationX, rotationY);
      return { x: rotated.x, y: rotated.y + shelfCenterY, z: rotated.z };
    };

    const projectScenePoint = (x: number, y: number, z: number) => {
      const rotated = transformScenePoint(x, y, z);
      return project(rotated.x, rotated.y, rotated.z);
    };

    // Drag Controls
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMousePos = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      rotationY += dx * 0.012;
      rotationX = Math.max(-0.45, Math.min(0.45, rotationX + dy * 0.008));
      lastMousePos = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        isDragging = true;
        lastMousePos = { x: touch.clientX, y: touch.clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!isDragging || !touch) return;
      const dx = touch.clientX - lastMousePos.x;
      const dy = touch.clientY - lastMousePos.y;
      rotationY += dx * 0.012;
      rotationX = Math.max(-0.45, Math.min(0.45, rotationX + dy * 0.008));
      lastMousePos = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // Main 3D Render Loop
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isDragging) {
        rotationY += 0.008;
      }

      ctx.clearRect(0, 0, width, height);

      // Background Ambient Spotlight
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2 - 20,
        15,
        width / 2,
        height / 2,
        160,
      );
      bgGrad.addColorStop(0, 'rgba(255, 215, 0, 0.14)');
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw 3D Virtual Showcase Shelf
      const shelfY = 55;
      const shelfWidth = 240;
      const shelfDepth = 80;

      const p1 = projectScenePoint(-shelfWidth / 2, shelfY, -shelfDepth / 2);
      const p2 = projectScenePoint(shelfWidth / 2, shelfY, -shelfDepth / 2);
      const p3 = projectScenePoint(shelfWidth / 2, shelfY, shelfDepth / 2);
      const p4 = projectScenePoint(-shelfWidth / 2, shelfY, shelfDepth / 2);

      // Shelf Top Face Gradient
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();

      const shelfGrad = ctx.createLinearGradient(p1.x, p1.y, p4.x, p4.y);
      shelfGrad.addColorStop(0, '#1E293B');
      shelfGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = shelfGrad;
      ctx.fill();
      ctx.strokeStyle = colors.brand;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Front Bevel Edge
      ctx.beginPath();
      ctx.moveTo(p4.x, p4.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p3.x, p3.y + 10);
      ctx.lineTo(p4.x, p4.y + 10);
      ctx.closePath();
      ctx.fillStyle = colors.surfaceRaised;
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.stroke();

      // Render 3D Trophies on Shelf
      const displayCount = Math.min(5, achievements.length);
      const spacing = 80;
      const startX = -((displayCount - 1) * spacing) / 2;

      const renderObjects: Array<{
        achievement: AchievementSummary;
        z: number;
        draw: () => void;
      }> = [];

      achievements.slice(0, displayCount).forEach((item, index) => {
        const isUnlocked = item.unlockedAt !== null;
        const isSelected = item.id === selectedId;

        const posX = startX + index * spacing;
        const posY = shelfY - 45;
        const posZ = 0;

        const transformedPosition = transformScenePoint(posX, posY, posZ);

        renderObjects.push({
          achievement: item,
          z: transformedPosition.z,
          draw: () => {
            ctx.save();

            // Ground Shadow beneath trophy
            const shadowCenter = projectScenePoint(posX, shelfY - 2, posZ);
            ctx.beginPath();
            ctx.ellipse(
              shadowCenter.x,
              shadowCenter.y,
              22 * shadowCenter.scale,
              8 * shadowCenter.scale,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fill();

            // Render Trophy Pedestal Base
            const baseP = projectScenePoint(posX, posY + 25, posZ);
            ctx.beginPath();
            ctx.arc(baseP.x, baseP.y, 18 * baseP.scale, 0, Math.PI * 2);
            ctx.fillStyle = isUnlocked ? '#334155' : '#1E293B';
            ctx.fill();
            ctx.strokeStyle = isUnlocked ? colors.brand : colors.border;
            ctx.lineWidth = isSelected ? 2.5 : 1;
            ctx.stroke();

            // Render 3D Trophy Body Geometry (Cup / Star / Shield)
            const nodeP = projectScenePoint(posX, posY, posZ);

            if (isUnlocked) {
              // Glowing Golden Trophy Cup
              ctx.shadowColor = '#FFD700';
              ctx.shadowBlur = isSelected ? 18 : 8;

              // Outer Ring
              ctx.beginPath();
              ctx.arc(nodeP.x, nodeP.y - 10, 16 * nodeP.scale, 0, Math.PI * 2);
              const goldGrad = ctx.createLinearGradient(
                nodeP.x - 16,
                nodeP.y - 26,
                nodeP.x + 16,
                nodeP.y + 6,
              );
              goldGrad.addColorStop(0, '#FFE066');
              goldGrad.addColorStop(0.5, '#FFD700');
              goldGrad.addColorStop(1, '#B8860B');
              ctx.fillStyle = goldGrad;
              ctx.fill();

              // Trophy Inner Star Badge
              ctx.fillStyle = '#0F172A';
              ctx.font = `bold ${Math.round(14 * nodeP.scale)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🏆', nodeP.x, nodeP.y - 10);
            } else {
              // Translucent Locked Badge
              ctx.beginPath();
              ctx.arc(nodeP.x, nodeP.y - 10, 15 * nodeP.scale, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
              ctx.fill();
              ctx.strokeStyle = colors.border;
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.font = `bold ${Math.round(13 * nodeP.scale)}px sans-serif`;
              ctx.fillStyle = colors.textDisabled;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🔒', nodeP.x, nodeP.y - 10);
            }

            ctx.shadowBlur = 0;

            // Highlight Ring for Selected Trophy
            if (isSelected) {
              ctx.beginPath();
              ctx.arc(nodeP.x, nodeP.y - 10, 22 * nodeP.scale, 0, Math.PI * 2);
              ctx.strokeStyle = colors.brand;
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            ctx.restore();
          },
        });
      });

      renderObjects.sort((a, b) => b.z - a.z).forEach((obj) => obj.draw());
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [achievements, selectedId, colors]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="trophy-outline" size={18} color={colors.brand} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>3D Trophy Cabinet</Text>
        </View>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          {supportsCanvas ? 'Drag to rotate 360°' : 'Your latest achievements'}
        </Text>
      </View>

      {supportsCanvas ? (
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 240, cursor: 'grab', display: 'block' }}
        />
      ) : (
        <View style={[styles.nativeTrophyStage, { backgroundColor: colors.surfaceRaised }]}>
          {achievements.slice(0, 5).map((item) => {
            const isSelected = item.id === selectedId;
            const isUnlocked = item.unlockedAt !== null;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${item.name}${isUnlocked ? ', unlocked' : ', locked'}`}
                onPress={() => setSelectedId(item.id)}
                style={({ pressed }) => [
                  styles.nativeTrophy,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.surface,
                    borderColor: isSelected ? colors.brand : colors.border,
                    opacity: pressed ? 0.8 : isUnlocked ? 1 : 0.6,
                  },
                ]}
              >
                <Text style={styles.nativeTrophyIcon}>{isUnlocked ? '🏆' : '🔒'}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? colors.onBrand : colors.textPrimary,
                    fontWeight: '700',
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Trophy Selector Pills */}
      <View style={styles.trophyPillsRow}>
        {achievements.slice(0, 5).map((item) => {
          const isSelected = item.id === selectedId;
          const isUnlocked = item.unlockedAt !== null;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setSelectedId(item.id)}
              style={({ pressed }) => [
                styles.trophyPill,
                {
                  backgroundColor: isSelected ? colors.brand : colors.surfaceRaised,
                  borderColor: isSelected ? colors.brand : colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 13 }}>{isUnlocked ? '🏆' : '🔒'}</Text>
              <Text
                numberOfLines={1}
                style={{
                  color: isSelected ? colors.onBrand : colors.textPrimary,
                  fontWeight: '700',
                  fontSize: 12,
                  maxWidth: 80,
                }}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active Selected Trophy Details Card */}
      {selectedAchievement ? (
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          <View style={styles.detailsHeaderRow}>
            <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>
              {selectedAchievement.unlockedAt ? '✨ ' : '🔒 '}
              {selectedAchievement.name}
            </Text>
            <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 12 }}>
                +{selectedAchievement.points} pts
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            {selectedAchievement.description}
          </Text>

          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.brand,
                    width: `${Math.min(100, (selectedAchievement.progress / selectedAchievement.target) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
              {selectedAchievement.progress}/{selectedAchievement.target}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    overflow: 'hidden',
    paddingTop: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitleWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  hintText: { fontSize: 11, fontWeight: '600' },
  nativeTrophyStage: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    minHeight: 160,
    padding: 18,
  },
  nativeTrophy: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    maxWidth: 104,
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  nativeTrophyIcon: { fontSize: 32 },
  trophyPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  trophyPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailsCard: {
    borderTopWidth: 1,
    gap: 8,
    padding: 14,
  },
  detailsHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  detailsTitle: { fontSize: 15, fontWeight: '800' },
  pointsBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 2 },
  progressTrack: { borderRadius: 999, flex: 1, height: 6, overflow: 'hidden' },
  progressFill: { borderRadius: 999, height: '100%' },
});
