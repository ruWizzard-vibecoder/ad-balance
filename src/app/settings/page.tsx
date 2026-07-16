"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PLATFORM_CONFIG, PLATFORM_SLUGS, type PlatformSlug } from "@/lib/constants";
import {
  Settings,
  Save,
  TestTube,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

const CREDENTIAL_FIELDS: Record<string, string[]> = {
  "vk-ads": ["client_id", "client_secret", "access_token", "refresh_token", "account_id"],
  "unity-ads": ["key_id", "secret_key", "organization_id"],
  mintegral: ["api_key", "access_key"],
};

export default function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery(trpc.settings.get.queryOptions());
  const { data: accountsData } = useQuery(trpc.settings.listAccounts.queryOptions());

  const updateSettings = useMutation(
    trpc.settings.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() }),
    })
  );

  const testSlack = useMutation(trpc.settings.testSlack.mutationOptions());
  const triggerFetch = useMutation(
    trpc.balances.triggerFetch.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    })
  );

  const [form, setForm] = useState({
    criticalThreshold: 1,
    warningThreshold: 2,
    cautionThreshold: 5,
    slackWebhookUrl: "",
    fetchIntervalMin: 10,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        criticalThreshold: settings.criticalThreshold,
        warningThreshold: settings.warningThreshold,
        cautionThreshold: settings.cautionThreshold,
        slackWebhookUrl: settings.slackWebhookUrl || "",
        fetchIntervalMin: settings.fetchIntervalMin,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      ...form,
      slackWebhookUrl: form.slackWebhookUrl || null,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Настройки</h1>
        <button
          onClick={() => triggerFetch.mutate()}
          disabled={triggerFetch.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${triggerFetch.isPending ? "animate-spin" : ""}`} />
          Обновить сейчас
        </button>
      </div>

      {/* Alert thresholds */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Пороги алертов (дни)
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
              Критический
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={form.criticalThreshold}
              onChange={(e) => setForm({ ...form, criticalThreshold: +e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
              Предупреждение
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={form.warningThreshold}
              onChange={(e) => setForm({ ...form, warningThreshold: +e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />
              Внимание
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={form.cautionThreshold}
              onChange={(e) => setForm({ ...form, cautionThreshold: +e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </section>

      {/* Slack */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Slack уведомления
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.slackWebhookUrl}
                onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  if (form.slackWebhookUrl) {
                    testSlack.mutate({ webhookUrl: form.slackWebhookUrl });
                  }
                }}
                disabled={!form.slackWebhookUrl || testSlack.isPending}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                <TestTube className="w-4 h-4" />
                Тест
              </button>
            </div>
            {testSlack.data && (
              <p className={`text-xs mt-1 ${testSlack.data.ok ? "text-green-600" : "text-red-600"}`}>
                {testSlack.data.ok ? "Сообщение отправлено!" : `Ошибка: ${testSlack.data.status}`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Accounts per platform */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Рекламные аккаунты
        </h2>
        <div className="space-y-4">
          {accountsData?.map((group) => (
            <PlatformAccountsSection key={group.platform.slug} group={group} />
          ))}
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {updateSettings.isPending ? "Сохранение..." : "Сохранить настройки"}
      </button>

      {updateSettings.isSuccess && (
        <p className="text-sm text-green-600 text-center">Настройки сохранены!</p>
      )}
    </div>
  );
}

interface PlatformGroup {
  platform: { id: string; slug: string; name: string; enabled: boolean };
  accounts: {
    id: string;
    name: string;
    enabled: boolean;
    credentials: Record<string, string>;
    hasToken: boolean;
    tokenExpiry: Date | null;
    createdAt: Date;
  }[];
}

function PlatformAccountsSection({ group }: { group: PlatformGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const config = PLATFORM_CONFIG[group.platform.slug as PlatformSlug];

  return (
    <div className="border border-slate-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: config?.color || "#6b7280" }}
          />
          <span className="font-medium text-sm">{config?.name || group.platform.name}</span>
          <span className="text-xs text-slate-400">
            ({group.accounts.length} {group.accounts.length === 1 ? "аккаунт" : "аккаунтов"})
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 p-3 space-y-3">
          {group.accounts.map((acc) => (
            <AccountItem
              key={acc.id}
              account={acc}
              platformSlug={group.platform.slug}
            />
          ))}

          {showAddForm ? (
            <AddAccountForm
              platformSlug={group.platform.slug}
              onClose={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить аккаунт
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AccountItem({
  account,
  platformSlug,
}: {
  account: PlatformGroup["accounts"][number];
  platformSlug: string;
}) {
  const [showCreds, setShowCreds] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [fields, setFields] = useState<Record<string, string>>({});
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateAccount = useMutation(
    trpc.settings.updateAccount.mutationOptions({
      onSuccess: () => {
        setEditMode(false);
        queryClient.invalidateQueries({ queryKey: trpc.settings.listAccounts.queryKey() });
      },
    })
  );

  const deleteAccount = useMutation(
    trpc.settings.deleteAccount.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.settings.listAccounts.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.balances.latest.queryKey() });
      },
    })
  );

  const credFields = CREDENTIAL_FIELDS[platformSlug] || Object.keys(account.credentials);

  return (
    <div className="border border-slate-100 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{account.name}</span>
          {account.hasToken && (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              Token OK
            </span>
          )}
          {!account.enabled && (
            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Отключен
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreds(!showCreds)}
            className="p-1 hover:bg-slate-100 rounded"
            title="Показать данные"
          >
            {showCreds ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => {
              setEditMode(!editMode);
              setEditName(account.name);
              const empty: Record<string, string> = {};
              for (const key of credFields) empty[key] = "";
              setFields(empty);
            }}
            className="p-1 hover:bg-slate-100 rounded"
            title="Редактировать"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Удалить аккаунт "${account.name}" и все его данные?`)) {
                deleteAccount.mutate({ accountId: account.id });
              }
            }}
            className="p-1 hover:bg-red-50 rounded"
            title="Удалить"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {showCreds && !editMode && (
        <div className="mt-2 space-y-1">
          {credFields.map((key) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-slate-500">{key}</span>
              <span className="font-mono text-slate-700">
                {account.credentials[key] || <span className="text-slate-300">не задано</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {editMode && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Название</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
            />
          </div>
          {credFields.map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">{key}</label>
              <input
                type="text"
                value={fields[key] || ""}
                onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                placeholder={account.credentials[key] || ""}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                const updates: Record<string, unknown> = { accountId: account.id };
                if (editName !== account.name) updates.name = editName;

                // Only send credentials if user filled in at least one field
                const hasNewCreds = Object.values(fields).some((v) => v);
                if (hasNewCreds) {
                  const merged: Record<string, string> = {};
                  for (const key of credFields) {
                    merged[key] = fields[key] || "";
                  }
                  updates.credentials = merged;
                }

                updateAccount.mutate(updates as Parameters<typeof updateAccount.mutate>[0]);
              }}
              disabled={updateAccount.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              Сохранить
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            >
              Отмена
            </button>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
              <input
                type="checkbox"
                checked={account.enabled}
                onChange={(e) => {
                  updateAccount.mutate({
                    accountId: account.id,
                    enabled: e.target.checked,
                  });
                }}
              />
              Активен
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAccountForm({
  platformSlug,
  onClose,
}: {
  platformSlug: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const credFields = CREDENTIAL_FIELDS[platformSlug] || [];

  const createAccount = useMutation(
    trpc.settings.createAccount.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.settings.listAccounts.queryKey() });
        onClose();
      },
    })
  );

  return (
    <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
      <p className="text-xs font-medium text-slate-700">Новый аккаунт</p>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-0.5">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${PLATFORM_CONFIG[platformSlug as PlatformSlug]?.name || platformSlug} — Основной`}
          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
        />
      </div>
      {credFields.map((key) => (
        <div key={key}>
          <label className="block text-xs font-medium text-slate-500 mb-0.5">{key}</label>
          <input
            type="text"
            value={fields[key] || ""}
            onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono bg-white"
          />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!name.trim()) return;
            createAccount.mutate({
              platformSlug,
              name: name.trim(),
              credentials: fields,
            });
          }}
          disabled={!name.trim() || createAccount.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50"
        >
          Создать
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 border border-slate-200 rounded text-xs"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
