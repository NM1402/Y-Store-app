import React, { useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ProductTabs({ description = "", specs = {}, reviews = [] }) {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);

  const tabs = useMemo(
    () => [
      { k: "desc", label: t("Опис", "Описание") },
      { k: "specs", label: t("Характеристики", "Характеристики") },
      { k: "reviews", label: t("Відгуки", "Отзывы") + (reviews.length ? ` (${reviews.length})` : "") },
    ],
    [language, reviews.length]
  );

  const [tab, setTab] = useState("desc");

  return (
    <div className="ys-tabs" data-testid="product-tabs">
      <div className="ys-tabs-head">
        {tabs.map((x) => (
          <button
            key={x.k}
            type="button"
            className={"ys-tab" + (tab === x.k ? " is-active" : "")}
            onClick={() => setTab(x.k)}
            data-testid={`tab-${x.k}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="ys-tabs-body">
        {tab === "desc" && (
          <div className="ys-prose">
            {description ? (
              <div dangerouslySetInnerHTML={{ __html: description }} />
            ) : (
              <span className="ys-muted">{t("Опис відсутній.", "Описание отсутствует.")}</span>
            )}
          </div>
        )}

        {tab === "specs" && <SpecsTable specs={specs} />}

        {tab === "reviews" && <Reviews reviews={reviews} />}
      </div>
    </div>
  );
}

function SpecsTable({ specs }) {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);
  
  // Handle different formats:
  // 1. Grouped format: [{group_name, fields: [{key, value}]}]
  // 2. Array format: [{name, value}]
  // 3. Object format: {name: value}
  
  // Check if it's grouped format (from admin panel)
  if (Array.isArray(specs) && specs.length > 0 && specs[0]?.group_name && specs[0]?.fields) {
    // Filter out empty groups and fields
    const nonEmptyGroups = specs
      .filter(group => group.fields && group.fields.some(f => f.key && f.value && f.value.trim() !== ''))
      .map(group => ({
        ...group,
        fields: group.fields.filter(f => f.key && f.value && f.value.trim() !== '')
      }))
      .filter(group => group.fields.length > 0);
    
    if (nonEmptyGroups.length === 0) {
      return <div className="ys-muted">{t("Характеристики не заповнені.", "Характеристики не заполнены.")}</div>;
    }
    
    return (
      <div className="ys-specs-grouped">
        {nonEmptyGroups.map((group, gIdx) => (
          <div key={gIdx} className="ys-specs-group">
            <h4 className="ys-specs-group-title" style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1e293b',
              padding: '12px 0 8px',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '8px'
            }}>
              {group.group_name}
            </h4>
            <div className="ys-specs">
              {group.fields.map((field, fIdx) => (
                <div className="ys-spec-row" key={fIdx}>
                  <div className="ys-spec-k">{field.key}</div>
                  <div className="ys-spec-v">{field.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Handle array format [{name, value}]
  let entries = [];
  
  if (Array.isArray(specs)) {
    entries = specs.filter(s => s && s.name && s.value).map(s => [s.name, s.value]);
  } else if (specs && typeof specs === 'object') {
    // Object format {name: value}
    entries = Object.entries(specs).filter(
      ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
    );
  }

  if (!entries.length) {
    return <div className="ys-muted">{t("Характеристики не заповнені.", "Характеристики не заполнены.")}</div>;
  }

  return (
    <div className="ys-specs">
      {entries.map(([k, v], idx) => (
        <div className="ys-spec-row" key={idx}>
          <div className="ys-spec-k">{k}</div>
          <div className="ys-spec-v">{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

function Reviews({ reviews }) {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);
  
  const list = Array.isArray(reviews) ? reviews : [];

  if (!list.length) {
    return <div className="ys-muted">{t("Поки що немає відгуків.", "Пока нет отзывов.")}</div>;
  }

  return (
    <div className="ys-reviews">
      {list.slice(0, 20).map((r, i) => (
        <div className="ys-review" key={i}>
          <div className="ys-review-top">
            <div className="ys-review-name">{r?.name || t("Покупець", "Покупатель")}</div>
            <div className="ys-review-rate">
              {"★".repeat(Math.max(1, Math.min(5, Number(r?.rating || 5))))}
              {"☆".repeat(5 - Math.max(1, Math.min(5, Number(r?.rating || 5))))}
            </div>
          </div>
          {r?.text && <div className="ys-review-text">{r.text}</div>}
        </div>
      ))}
    </div>
  );
}
