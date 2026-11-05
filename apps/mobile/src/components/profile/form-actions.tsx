import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useI18n } from "../../theme/preferences-provider";
import { Alert, Button } from "../ui";

/** The bottom of every form: an error if saving failed, then Save and Cancel. */
export function FormActions({ saving, formError, onSave, saveLabel }: { saving: boolean; formError?: string; onSave: () => void; saveLabel?: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.actions}>
      {formError && <Alert tone="error" message={formError} />}
      <Button label={saveLabel ?? t("common.save")} loading={saving} onPress={onSave} fullWidth />
      <Button label={t("common.cancel")} variant="outline" onPress={() => router.back()} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({ actions: { gap: 8, paddingTop: 8 } });
