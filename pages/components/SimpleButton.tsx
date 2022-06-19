import React from 'react'
import styles from '../../styles/SimpleButton.module.css';

/** Props for an input element. */
type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export type SimpleButtonProps = Omit<InputProps, 'type'>;

/** A normal button, but with the "simpleButton" css class added. */
export function SimpleButton(props: SimpleButtonProps) {
  const { className, ...rest } = props;
  return (
    <input
      type='button'
      className={`${styles.simpleButton} ${props.className || ''}`}
      { ...rest } />
  );
}
