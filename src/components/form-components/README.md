# Компоненти форм

Структура відповідає живим модулям Residdy CRM: компонент і SCSS Module у власній папці, прямі імпорти. HTTP та мутації залишаються в API/hooks, предметна валідація — у feature-форми.

| Компонент         | Призначення                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| FormContainer     | Form/fieldset, pending, помилка, onSubmit та спільний footer                                  |
| FormFooter        | Submit із spinner і необов'язковий cancel; обидві дії блокуються під час відправлення         |
| MediaFileInput    | Одне поле файла з label, accept, hint, вибраним ім'ям і preview як ReactNode                  |
| FormInput         | Наявне поле авторизації, включно з перемикачем пароля                                         |
| TextInput         | Контрольоване текстове/числове поле CRM з inputTitle та native-атрибутами                     |
| FormIconInput     | Вибір public-іконки за ID через спільний IconGrid; популярні першими                          |
| FormColorInput    | Палітра й довільний HEX-колір; однаковий колір бордера та слабкого фону                       |
| FormReminderInput | Набір унікальних email-offset у хвилинах, до 10; готові й довільні значення                   |
| FormSelect        | Власний combobox/listbox із selectTitle, типізованими options/value та пошуком довгих списків |
| FormTextarea      | Контрольований багаторядковий текст із inputTitle та native-атрибутами                        |
| FormDateTimeInput | Компактна пара дати й часу; перетворення у часовий пояс робить feature                        |
| FormTaskTypeInput | Вибір типу із кольором та іконкою; активні типи, дефолтний та поточний архівний               |

FormContainer викликає onSubmit після preventDefault; не додавай повторну відправку через onClick кнопки. isPending вимикає fieldset, submitDisabled визначає готовність форми.

MediaFileInput передає File або null через setFile. Батьківська форма керує File, помилками й object URL: створює прев'ю при виборі, звільняє URL при заміні та демонтажі. Тип і розмір остаточно перевіряє сервер.

Для upload асета додавай TextInput назви та спільний `useUploadName(initialName?)`: `{ name, setName, setFileName, isValid }`. Після валідного вибору файла викликай setFileName(file). Порожня або попередня автоматична назва оновиться, введена вручну збережеться; null не очищує назву. Надсилай `originalName: name.trim()` лише коли isValid (1–255 символів без керівних символів). У новому документі клієнта/етапу назва title виконує цю роль, окремий дубльований інпут не потрібен. Кеш успішного upload при невдалому збереженні батьківського запису залежить від файла та назви; перед заміною прибери лише свій ще не прив’язаний асет.

Popup уже містить заголовок; не дублюй його у формі. Для асинхронної відправки передавай pending у closeDisabled попапа. IconCreateForm показує приклад композиції та збереження файла після помилки.

Нові поля приймають inputTitle, контрольоване value і onChange зі значенням, як у Residdy CRM. FormIconInput має nullable ID до вибору й використовує спільну пагінацію public assets; Escape закриває picker перед батьківським Popup. FormColorInput передає шестизначний HEX, FormReminderInput — масив хвилин без повторів. Для pending передавай disabled, а всю форму блокуй через FormContainer.

FormSelect приймає options `{ title, value }`, selectTitle та value/onChange; значення — string, number або null, без ручного розбору у feature. FormTextarea повторює контракт TextInput. FormDateTimeInput приймає date/time, onDateChange/onTimeChange та необов'язкові dateTitle/timeTitle. FormTaskTypeInput отримує вибраний ID, onChange та selectedType для редагування архівного типу. Автоматичний вибір isDefault виконує предметна форма. Вкладені picker закриваються через Escape перед Popup.

FormSelect не використовує native select. Контракт `options { title, value }`, `value`, `onChange`, `disabled`, `required` і `hint` збережений; `searchable` необов’язковий, стандартно вмикається від 8 опцій. Popup монтується в активний HTML dialog або body, враховує viewport і прокрутку. Стрілки, Home/End, Enter, Escape й Tab керують вибором; перший Escape закриває тільки список. Форма зберігає HTML required-валідацію і disabled fieldset. Для оформлення trigger у feature CSS використовуй `[data-form-select-trigger]`.
