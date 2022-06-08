import * as React from 'react';

// @ts-ignore
export const Unmounter = ({ above = false, buttonClasses = '', children }) => {
  const [mounted, setMounted] = React.useState(true);
  const content = [
    children,
    <p>
      <button
        data-testid="unmounter-button"
        onClick={() => setMounted((m) => !m)}
      >
        {mounted ? 'Unmount' : 'Remount'}
      </button>
    </p>,
  ];
  above && content.reverse();
  return (
    <div>
      {mounted && content}
      {!mounted && (
        <p>
          Unmounted!{' '}
          <span>
            <button className={buttonClasses} onClick={() => setMounted(true)}>
              Remount
            </button>
          </span>
        </p>
      )}
    </div>
  );
};
