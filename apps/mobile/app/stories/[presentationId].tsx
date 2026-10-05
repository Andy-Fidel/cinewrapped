import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy story links resolve to the same authenticated, owned snapshot reader. */
export default function StoryPresentationScreen() {
  const { presentationId } = useLocalSearchParams<{ presentationId: string }>();
  return typeof presentationId === 'string' &&
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(presentationId) ? (
    <Redirect href={`/wraps/${presentationId}`} />
  ) : (
    <Redirect href="/insights" />
  );
}
