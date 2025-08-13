import { useTranslation } from "../../../i18n/useTranslation";
import { Button } from "../../components/ui/button";
import Box from "../../components/Box";
import { CompleteProps } from "./types";
import style from "./style/Complete.module.scss";
import { PiArrowCounterClockwise, PiCheckBold } from "react-icons/pi";

export default function Complete({ reload, close, isModal }: CompleteProps) {
  const { t } = useTranslation();
  return (
    <Box className={style.content}>
      <>
        <span className={style.icon}>
          <PiCheckBold />
        </span>
        <div>{t("Import Successful")}</div>
        <div className={style.actions}>
          <Button type="button" variant="outline" onClick={reload}>
            <PiArrowCounterClockwise className="mr-2 h-4 w-4" />
            {t("Upload another file")}
          </Button>
          {isModal && (
            <Button type="button" onClick={close}>
              <PiCheckBold className="mr-2 h-4 w-4" />
              {t("Done")}
            </Button>
          )}
        </div>
      </>
    </Box>
  );
}
