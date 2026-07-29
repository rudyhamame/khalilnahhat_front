import { LoaderCircle, Send } from 'lucide-react';
import { useState } from 'react';

const initialValues = {
  fullName: '',
  email: '',
  phone: '',
  organization: '',
  eventType: '',
  eventDate: '',
  city: '',
  country: '',
  venueName: '',
  attendance: '',
  setDuration: '',
  musicDirection: '',
  budgetRange: '',
  notes: '',
  consent: false,
};

function validate(values) {
  const errors = {};
  const today = new Date().toISOString().split('T')[0];

  if (!values.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.eventType) errors.eventType = 'Select an event type.';
  if (!values.eventDate) {
    errors.eventDate = 'Event date is required.';
  } else if (values.eventDate < today) {
    errors.eventDate = 'Choose a future event date.';
  }
  if (!values.city.trim()) errors.city = 'City is required.';
  if (!values.country.trim()) errors.country = 'Country is required.';
  if (!values.budgetRange) errors.budgetRange = 'Select a budget range.';
  if (!values.consent) errors.consent = 'Consent is required before submitting.';

  return errors;
}

async function submitBookingRequest(apiUrl, values) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error('API response was not successful.');
  }

  return response.json();
}

function BookingForm({ booking }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: '', message: '' });

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitState({ type: '', message: '' });

    if (Object.keys(nextErrors).length > 0) {
      setSubmitState({
        type: 'error',
        message: 'Check the highlighted fields before transmitting the request.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitBookingRequest(booking.apiUrl, values);
      setSubmitState({
        type: 'success',
        message: `BOOKING REQUEST TRANSMITTED\nREFERENCE: ${result.reference}`,
      });
      setValues(initialValues);
      setErrors({});
    } catch {
      setSubmitState({
        type: 'error',
        message: 'Transmission failed. Please try again or use the direct booking email.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="booking-layout">
      <div className="booking-copy">
        <h2>{booking.heading}</h2>
        <p>{booking.description}</p>
        <div className="contact-stack">
          {booking.directContacts.map((contact) => (
            <a key={contact.label} href={contact.href}>
              <span>{contact.label}</span>
              <strong>{contact.value}</strong>
            </a>
          ))}
        </div>
      </div>

      <form className="booking-form" noValidate onSubmit={handleSubmit}>
        <p className="detail-label">Transmission Request</p>
        {submitState.message ? (
          <div className={`form-status ${submitState.type}`} aria-live="polite">
            {submitState.message}
          </div>
        ) : null}

        <div className="form-grid">
          <label>
            Full name *
            <input name="fullName" value={values.fullName} onChange={handleChange} />
            {errors.fullName ? <span className="field-error">{errors.fullName}</span> : null}
          </label>
          <label>
            Email *
            <input name="email" type="email" value={values.email} onChange={handleChange} />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>
          <label>
            Phone number
            <input name="phone" value={values.phone} onChange={handleChange} />
          </label>
          <label>
            Organization or venue
            <input name="organization" value={values.organization} onChange={handleChange} />
          </label>
          <label>
            Event type *
            <select name="eventType" value={values.eventType} onChange={handleChange}>
              <option value="">Select one</option>
              {booking.eventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
            {errors.eventType ? <span className="field-error">{errors.eventType}</span> : null}
          </label>
          <label>
            Event date *
            <input name="eventDate" type="date" value={values.eventDate} onChange={handleChange} />
            {errors.eventDate ? <span className="field-error">{errors.eventDate}</span> : null}
          </label>
          <label>
            City *
            <input name="city" value={values.city} onChange={handleChange} />
            {errors.city ? <span className="field-error">{errors.city}</span> : null}
          </label>
          <label>
            Country *
            <input name="country" value={values.country} onChange={handleChange} />
            {errors.country ? <span className="field-error">{errors.country}</span> : null}
          </label>
          <label>
            Venue name
            <input name="venueName" value={values.venueName} onChange={handleChange} />
          </label>
          <label>
            Expected attendance
            <input name="attendance" value={values.attendance} onChange={handleChange} />
          </label>
          <label>
            Requested set duration
            <input name="setDuration" value={values.setDuration} onChange={handleChange} />
          </label>
          <label>
            Preferred music direction
            <input name="musicDirection" value={values.musicDirection} onChange={handleChange} />
          </label>
          <label>
            Budget range in CAD *
            <select name="budgetRange" value={values.budgetRange} onChange={handleChange}>
              <option value="">Select one</option>
              {booking.budgetRanges.map((budgetRange) => (
                <option key={budgetRange} value={budgetRange}>
                  {budgetRange}
                </option>
              ))}
            </select>
            {errors.budgetRange ? <span className="field-error">{errors.budgetRange}</span> : null}
          </label>
          <label className="full-span">
            Additional notes
            <textarea name="notes" rows="5" value={values.notes} onChange={handleChange} />
          </label>
        </div>

        <label className="checkbox-row">
          <input name="consent" type="checkbox" checked={values.consent} onChange={handleChange} />
          <span>I agree to be contacted about this booking request. *</span>
        </label>
        {errors.consent ? <span className="field-error">{errors.consent}</span> : null}

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
          <span>{isSubmitting ? 'Transmitting...' : 'Transmit request'}</span>
        </button>
      </form>
    </div>
  );
}

export default BookingForm;
